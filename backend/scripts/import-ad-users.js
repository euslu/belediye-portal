require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client }      = require('ldapts');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg }    = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma  = new PrismaClient({ adapter });

// AD'deki gruba göre portal rolü belirle
// NOT: Domain Admins → portal admin yapılmaz. Admin yetkisi sadece UserRole (RBAC) tablosundan gelir.
const MANAGER_GROUP = process.env.AD_MANAGER_GROUP || 'paylasim_BI_yonetici_WR';

function parseCN(dnList) {
  if (!dnList) return [];
  const list = Array.isArray(dnList) ? dnList : [dnList];
  return list.map((dn) => { const m = String(dn).match(/^CN=([^,]+)/i); return m ? m[1] : null; }).filter(Boolean);
}

function getRole(groups) {
  if (groups.includes(MANAGER_GROUP)) return 'manager';
  return 'user';
}

// OU kodu → Daire Başkanlığı adı
const DIRECTORATE_MAP = {
  ulasim_db:                        'Ulaşım Dairesi Başkanlığı',
  itfaiye_db:                       'İtfaiye Dairesi Başkanlığı',
  fenisleri_db:                     'Fen İşleri Dairesi Başkanlığı',
  tarimsalhizmetler_db:             'Tarımsal Hizmetler Dairesi Başkanlığı',
  zabita_db:                        'Zabıta Dairesi Başkanlığı',
  saglikvesosyalhizmetler_db:       'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı',
  cevrekorumavekontrol_db:          'Çevre Koruma ve Kontrol Dairesi Başkanlığı',
  destekhizmetleri_db:              'Destek Hizmetleri Dairesi Başkanlığı',
  kultursanatvesosyalisler_db:      'Kültür, Sanat ve Sosyal İşler Dairesi Başkanlığı',
  malihizmetler_db:                 'Mali Hizmetler Dairesi Başkanlığı',
  genclikvesporhizmetleri_db:       'Gençlik ve Spor Hizmetleri Dairesi Başkanlığı',
  imarvesehircilik_db:              'İmar ve Şehircilik Dairesi Başkanlığı',
  bilgiislem_db:                    'Bilgi İşlem Dairesi Başkanlığı',
  basinyayinvehalklailiskiler_db:   'Basın Yayın ve Halkla İlişkiler Dairesi Başkanlığı',
  etutveprojeler_db:                'Etüt ve Projeler Dairesi Başkanlığı',
  insankaynaklariveegitim_db:       'İnsan Kaynakları ve Eğitim Dairesi Başkanlığı',
  kadinveailehizmetleri_db:         'Kadın ve Aile Hizmetleri Dairesi Başkanlığı',
  kenttarihitanitimveturizm_db:     'Kent Tarihi, Tanıtım ve Turizm Dairesi Başkanlığı',
  afetisleriveriskyonetimi_db:      'Afet İşleri ve Risk Yönetimi Dairesi Başkanlığı',
  emlakveistimlak_db:               'Emlak ve İstimlak Dairesi Başkanlığı',
  muhtarlikisleri_db:               'Muhtarlık İşleri Dairesi Başkanlığı',
  yaziislerivekararlar_db:          'Yazı İşleri ve Kararlar Dairesi Başkanlığı',
  disiliskiler_db:                  'Dış İlişkiler Dairesi Başkanlığı',
  iklimdegisikligivesifiratik_db:   'İklim Değişikliği ve Sıfır Atık Dairesi Başkanlığı',
  akillisehirvekentbilgisistemleri_db: 'Akıllı Şehir ve Kent Bilgi Sistemleri Dairesi Başkanlığı',
  ilcehizmetleri1bolge_db:          'İlçe Hizmetleri 1. Bölge Dairesi Başkanlığı',
  ilcehizmetleri2bolge_db:          'İlçe Hizmetleri 2. Bölge Dairesi Başkanlığı',
  ilcehizmetleri3bolge_db:          'İlçe Hizmetleri 3. Bölge Dairesi Başkanlığı',
  ilcehizmetleri4bolge_db:          'İlçe Hizmetleri 4. Bölge Dairesi Başkanlığı',
};

// DN'den daire başkanlığı OU kodunu çıkar: ...,OU=bilgiislem_db,...
function extractDirectorate(dn) {
  if (!dn) return null;
  const parts = String(dn).split(',');
  const dbPart = parts.find((p) => /^OU=.+_db$/i.test(p.trim()));
  if (!dbPart) return null;
  const code = dbPart.trim().replace(/^OU=/i, '').toLowerCase();
  return DIRECTORATE_MAP[code] || null;
}

// Departman adı normalleştirme:
//  - Çift/fazla boşluk → tek boşluk
//  - Bağlaç "Ve" → "ve"  (Türkçe yazım kuralı)
//  - Parantez içi kısaltmalar büyük harf  → (AYKOME), (UKOME), (KUDEB)
//  - Kesilen isimler: "...Persone" → "...Personeli"
function normalizeDept(raw) {
  if (!raw) return null;
  let s = raw.trim().replace(/\s+/g, ' ');

  // AD'nin 64 karakter limiti nedeniyle kesilen "Persone[l]" → "Personeli"
  s = s.replace(/\bPersonel?$/, 'Personeli');

  // Bağlaç "Ve" → "ve"
  s = s.replace(/\bVe\b/g, 've');

  // Parantez içindeki kısaltmaları büyük harfe çevir: (aykome) → (AYKOME)
  // Sadece 3-8 harfli, harf dışı karakter içermeyen kısaltmalar
  s = s.replace(/\(([a-zA-ZğüşıöçĞÜŞİÖÇ]{2,8})\)/g, (_, m) => `(${m.toUpperCase()})`);

  return s;
}

async function main() {
  console.log('AD\'ye bağlanılıyor...');
  const client = new Client({ url: process.env.AD_URL });
  await client.bind(
    `${process.env.AD_USERNAME}@${process.env.AD_DOMAIN}`,
    process.env.AD_PASSWORD
  );

  console.log('Kullanıcılar çekiliyor...');
  const { searchEntries } = await client.search(process.env.AD_BASE_DN, {
    scope:  'sub',
    filter: '(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))',
    attributes: ['sAMAccountName', 'displayName', 'mail', 'department', 'title', 'memberOf', 'distinguishedName'],
    paged: { pageSize: 200 },
  });
  await client.unbind();

  // Geçersiz/sistem hesaplarını filtrele
  const users = searchEntries
    .filter((e) => e.sAMAccountName && e.displayName && !String(e.sAMAccountName).endsWith('$'))
    .map((e) => {
      const groups = parseCN(e.memberOf);
      return {
        username:    String(e.sAMAccountName).toLowerCase().trim(),
        displayName: String(e.displayName).trim(),
        email:       e.mail       ? String(e.mail).toLowerCase().trim() : null,
        department:  normalizeDept(e.department ? String(e.department) : null),
        directorate: extractDirectorate(e.distinguishedName),
        title:       e.title      ? String(e.title).trim()              : null,
        role:        getRole(groups),
      };
    });

  console.log(`${users.length} kullanıcı bulundu. Veritabanına aktarılıyor...\n`);

  let created = 0, updated = 0, skipped = 0;
  const BATCH = 50;

  for (let i = 0; i < users.length; i += BATCH) {
    const batch = users.slice(i, i + BATCH);
    await Promise.all(batch.map(async (u) => {
      try {
        const existing = await prisma.user.findUnique({ where: { username: u.username } });
        if (existing) {
          // Mevcut kullanıcıyı güncelle ama rolünü koru (manuel atanmışsa)
          await prisma.user.update({
            where: { username: u.username },
            data: {
              displayName:  u.displayName,
              email:        u.email,
              department:   u.department,
              directorate:  u.directorate,
              title:        u.title,
              // Rol: AD'den gelen rolü kullan (admin yetkisi UserRole tablosundan yönetilir)
              role: u.role,
            },
          });
          updated++;
        } else {
          await prisma.user.create({ data: u });
          created++;
        }
      } catch {
        skipped++;
      }
    }));

    process.stdout.write(`\r  İşlendi: ${Math.min(i + BATCH, users.length)} / ${users.length}`);
  }

  console.log(`\n\n✓ Tamamlandı:`);
  console.log(`  Yeni oluşturulan : ${created}`);
  console.log(`  Güncellenen      : ${updated}`);
  console.log(`  Atlanan (hata)   : ${skipped}`);

  const total = await prisma.user.count();
  console.log(`  Toplam DB kaydı  : ${total}`);
}

main()
  .catch((err) => { console.error('\nHata:', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
