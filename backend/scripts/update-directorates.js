require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client }      = require('ldapts');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg }    = require('@prisma/adapter-pg');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

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

function extractDirectorate(dn) {
  if (!dn) return null;
  const parts = String(dn).split(',');
  const dbPart = parts.find((p) => /^OU=.+_db$/i.test(p.trim()));
  if (!dbPart) return null;
  const code = dbPart.trim().replace(/^OU=/i, '').toLowerCase();
  return DIRECTORATE_MAP[code] || null;
}

async function main() {
  console.log("AD'ye bağlanılıyor...");
  const client = new Client({ url: process.env.AD_URL });
  await client.bind(`${process.env.AD_USERNAME}@${process.env.AD_DOMAIN}`, process.env.AD_PASSWORD);

  const { searchEntries } = await client.search(process.env.AD_BASE_DN, {
    scope:  'sub',
    filter: '(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))',
    attributes: ['sAMAccountName', 'distinguishedName'],
    paged: { pageSize: 200 },
  });
  await client.unbind();
  console.log(`${searchEntries.length} kullanıcı alındı. Güncelleniyor...`);

  const map = {};
  searchEntries.forEach((e) => {
    if (!e.sAMAccountName || String(e.sAMAccountName).endsWith('$')) return;
    const username = String(e.sAMAccountName).toLowerCase().trim();
    map[username] = extractDirectorate(e.distinguishedName);
  });

  const entries = Object.entries(map);
  let updated = 0;
  for (let i = 0; i < entries.length; i += 100) {
    const batch = entries.slice(i, i + 100);
    await Promise.all(batch.map(([username, directorate]) =>
      prisma.user.updateMany({ where: { username }, data: { directorate } }).then((r) => { updated += r.count; }).catch(() => {})
    ));
    process.stdout.write(`\r  İşlendi: ${Math.min(i + 100, entries.length)} / ${entries.length}`);
  }

  const filled = await prisma.user.count({ where: { directorate: { not: null } } });
  console.log(`\n\n✓ Güncellenen: ${updated}`);
  console.log(`  Daire atanan: ${filled} kullanıcı`);
}

main()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
