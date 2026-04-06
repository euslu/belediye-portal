/**
 * GSM Hat Atlasası → FlexCity eşitleme
 * 1. Daire adlarını FlexCity canonical isimlerine normalize eder
 * 2. displayName → User tablosu eşleşmesi ile username doldurur
 * 3. FlexCity personel DAIRE alanıyla ek doğrulama yapar
 */
require('dotenv').config();
const prisma = require('../lib/prisma');
const { getBskDataset } = require('../services/flexcity');

// ── Excel daire adı → FlexCity canonical eşlemesi ───────────────────────────
const DAIRE_MAP = {
  'AFET İŞLERİ DAİRESİ BAŞKANLIĞI':                        'Afet İşleri ve Risk Yönetimi Dairesi Başkanlığı',
  'AKILLI ŞEHİR DAİRESİ BAŞKANLIĞI':                       'Akıllı Şehir ve Kent Bilgi Sistemleri Dairesi Başkanlığı',
  'BASIN YAYIN VE HALKLA İLİŞKİLER DAİRESİ BAŞKANLIĞI':   'Basın Yayın ve Halkla İlişkiler Dairesi Başkanlığı',
  'BİLGİ İŞELM DAİRESİ BAŞKANLIĞI':                        'Bilgi İşlem Dairesi Başkanlığı',
  'BİLGİ İŞLEM DAİRESİ BAŞKANLIĞI':                        'Bilgi İşlem Dairesi Başkanlığı',
  'DESTEK HİZMETLERİ DAİRESİ BAŞKANLIĞI':                  'Destek Hizmetleri Dairesi Başkanlığı',
  'DIŞ İLİŞKİLER DAİRESİ BAŞKANLIĞI':                      'Dış İlişkiler Dairesi Başkanlığı',
  'EMLAK VE İSTİMLAK DAİRESİ BAŞKANLIĞI':                  'Emlak ve İstimlak Dairesi Başkanlığı',
  'ETÜT VE PROJELER DAİRESİ BAŞKANLIĞI':                   'Etüt ve Projeler Dairesi Başkanlığı',
  'FEN İŞLERİ DAİRESİ BAŞKANLIĞI':                         'Fen İşleri Dairesi Başkanlığı',
  'GENÇLİK VE SPOR HİZMETLERİ DAİRE BAŞKANLIĞI':          'Gençlik ve Spor Hizmetleri Dairesi Başkanlığı',
  'GENÇLİK VE SPOR HİZMETLERİ DAİRESİ BAŞKANLIĞI':        'Gençlik ve Spor Hizmetleri Dairesi Başkanlığı',
  'KADIN VE AİLE HİZMETLERİ DAİRESİ BAŞKANLIĞI':          'Kadın ve Aile Hizmetleri Dairesi Başkanlığı',
  'KENT TARİHİ VE TANITIM DAİRESİ BAŞKANLIĞI':             'Kent Tarihi, Tanıtım ve Turizm Dairesi Başkanlığı',
  'KÜLTÜR VE SOSYAL İŞLER DAİRESİ BAŞKANLIĞI':             'Kültür, Sanat ve Sosyal İşler Dairesi Başkanlığı',
  'MALİ HİZMETLER DAİRESİ BAŞKANLIĞI':                     'Mali Hizmetler Dairesi Başkanlığı',
  'MUHTARLIK İŞLERİ DAİRESİ BAŞKANLIĞI':                   'Muhtarlık İşleri Dairesi Başkanlığı',
  'ÖZEL KALEM MÜDÜRLÜĞÜ':                                   'Özel Kalem Müdürlüğü',
  'SAĞLIK VE SOSYAL HİZMETLER DAİRESİ BAŞKANLIĞI':         'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı',
  'TARIMSAL HİZMETLER DAİRESİ BAŞKANLIĞI':                 'Tarımsal Hizmetler Dairesi Başkanlığı',
  'ULAŞIM DAİRESİ BAŞKANLIĞI':                              'Ulaşım Dairesi Başkanlığı',
  'ULAŞIM DAİRESİ BAŞKANLIĞI / Terminal Şb.':              'Ulaşım Dairesi Başkanlığı',
  'ULAŞIM DAİRESİ BAŞKANLIĞI / Trafik Şb.':                'Ulaşım Dairesi Başkanlığı',
  'ULAŞIM DAİRESİ BAŞKANLIĞI / İkmal şb.':                 'Ulaşım Dairesi Başkanlığı',
  'ULAŞIM DAİRESİ BAŞKANLIĞI / Planlama şb.':              'Ulaşım Dairesi Başkanlığı',
  'YAZИ İŞLERİ VE KARARLAR DAİRESİ BAŞKANLIĞI':            'Yazı İşleri ve Kararlar Dairesi Başkanlığı',
  'ZABITA DAİRESİ BAŞKANLIĞI':                              'Zabıta Dairesi Başkanlığı',
  'ÇEVRE KORUMA VE KONTROL DAİRESİ BAŞKANLIĞI':            'Çevre Koruma ve Kontrol Dairesi Başkanlığı',
  'İLÇE HİZMETLERİ 1. BÖLGE DAİRESİ BAŞKANLIĞI':          'İlçe Hizmetleri 1. Bölge Dairesi Başkanlığı',
  'İLÇE HİZMETLERİ 2.BÖLGE DAİRE BAŞKANLIĞI':             'İlçe Hizmetleri 2. Bölge Dairesi Başkanlığı',
  'İLÇE HİZMETLERİ 2. BÖLGE DAİRESİ BAŞKANLIĞI':          'İlçe Hizmetleri 2. Bölge Dairesi Başkanlığı',
  'İLÇE HİZMETLERİ 3. BÖLGE DAİRESİ BAŞKANLIĞI':          'İlçe Hizmetleri 3. Bölge Dairesi Başkanlığı',
  'İMAR VE ŞEHİRCİLİK DAİRESİ BAŞKANLIĞI':                'İmar ve Şehircilik Dairesi Başkanlığı',
  'İNSAN KAYNAKLARI VE EĞİTİM DAİRESİ BAŞKANLIĞI':        'İnsan Kaynakları ve Eğitim Dairesi Başkanlığı',
  'İTFAİYE DAİRESİ BAŞKANLIĞI':                            'İtfaiye Dairesi Başkanlığı',
  'İklim Değişikliği ve Sıfır Atık Dairesi Başkanlığı':   'İklim Değişikliği ve Sıfır Atık Dairesi Başkanlığı',
  'Genel Sekreterlik':                                      'Genel Sekreterlik',
};

// Ulaşım alt-şube ayıkla (department alanına yaz)
function extractDept(rawDir) {
  const m = rawDir?.match(/ULAŞIM DAİRESİ BAŞKANLIĞI\s*\/\s*(.+)/i);
  return m ? m[1].trim() : null;
}

// Normalize: büyük harf boşluk temizle, map'te ara
function normalizeDaire(raw) {
  if (!raw) return { directorate: null, department: null };
  const dept = extractDept(raw);
  const canonical = DAIRE_MAP[raw.trim()] || raw.trim();
  return { directorate: canonical, department: dept };
}

// Ada göre normalize (büyük→küçük, çoklu boşluk, Türkçe karakter düz)
function normName(s) {
  if (!s) return '';
  return s.toUpperCase()
    .replace(/İ/g, 'I').replace(/Ğ/g, 'G').replace(/Ü/g, 'U')
    .replace(/Ş/g, 'S').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
    .replace(/\s+/g, ' ').trim();
}

async function main() {
  // ── 1. AD kullanıcılarını çek ──────────────────────────────────────────────
  const users = await prisma.user.findMany({
    select: { username: true, displayName: true, directorate: true }
  });
  const userByName = {};
  for (const u of users) {
    if (u.displayName) {
      const key = normName(u.displayName);
      userByName[key] = u;
    }
  }
  console.log(`AD kullanıcı: ${users.length}, unique displayName: ${Object.keys(userByName).length}`);

  // ── 2. FlexCity personel çek ───────────────────────────────────────────────
  let fcPersonel = [];
  try {
    fcPersonel = await getBskDataset('BSK_PERSONEL_BILGI');
    console.log(`FlexCity personel: ${fcPersonel.length}`);
  } catch (e) {
    console.warn('FlexCity erişilemiyor, sadece AD ile eşleştirme yapılacak:', e.message);
  }

  // FlexCity adına göre indeks: "AD SOYAD" → {DAIRE, ...}
  const fcByName = {};
  for (const r of fcPersonel) {
    const fullName = `${r.AD || ''} ${r.SOYAD || ''}`.trim();
    if (fullName) fcByName[normName(fullName)] = r;
  }

  // ── 3. HatAtamasi kayıtlarını çek ─────────────────────────────────────────
  const hatlar = await prisma.hatAtamasi.findMany();
  console.log(`\nHatAtamasi: ${hatlar.length} kayıt\n`);

  let dirUpdated = 0, userMatched = 0, noMatch = 0;
  const noMatchList = [];

  for (const hat of hatlar) {
    const updates = {};

    // ── Daire adı normalize ────────────────────────────────────────────────
    const { directorate: newDir, department: newDept } = normalizeDaire(hat.directorate);
    if (newDir !== hat.directorate) {
      updates.directorate = newDir;
      dirUpdated++;
    }
    if (newDept && newDept !== hat.department) {
      updates.department = newDept;
    }

    // ── Personel eşleştir ──────────────────────────────────────────────────
    if (!hat.username && hat.displayName) {
      const rawName = hat.displayName;

      // "AD SOYAD - UNVAN" veya "AD SOYAD-UNVAN" → sadece ad soyad kısmı al
      const namePart = rawName.split(/[-–]/)[0].trim();
      // "AD SOYAD MÜDÜR" gibi unvan suffix'i sıyır
      const unvanRe = /\s+(MÜDÜR|BAŞKAN[I]?|ŞEF[İ]?|BAŞKANI|UZMAN[I]?|TEKNISYEN[İ]?)$/i;
      const nameNoUnvan = namePart.replace(unvanRe, '').trim();

      // Deneme sırası: tam ad → ad kısmı → unvansız
      const candidates = [...new Set([rawName, namePart, nameNoUnvan])].filter(Boolean);
      let matched = false;

      for (const cand of candidates) {
        const key = normName(cand);
        const adUser = userByName[key];
        if (adUser) {
          updates.username = adUser.username;
          // displayName'i de düzelt (unvan olmadan)
          if (cand !== rawName) updates.displayName = cand;
          userMatched++;
          matched = true;
          break;
        }
        // FlexCity'de ara
        const fcUser = fcByName[key];
        if (fcUser) {
          userMatched++;
          matched = true;
          break;
        }
      }

      if (!matched) {
        noMatch++;
        noMatchList.push({ id: hat.id, displayName: rawName, directorate: hat.directorate });
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.hatAtamasi.update({ where: { id: hat.id }, data: updates });
    }
  }

  console.log(`Daire adı normalize: ${dirUpdated}`);
  console.log(`Personel eşleşti (AD):  ${userMatched}`);
  console.log(`Personel eşleşmedi: ${noMatch}`);

  if (noMatchList.length > 0 && noMatchList.length <= 30) {
    console.log('\nEşleşmeyen personeller:');
    noMatchList.forEach(x => console.log(`  [${x.id}] "${x.displayName}" | ${x.directorate}`));
  } else if (noMatchList.length > 30) {
    console.log(`\nEşleşmeyen ${noMatchList.length} personelin ilk 20'si:`);
    noMatchList.slice(0, 20).forEach(x => console.log(`  [${x.id}] "${x.displayName}" | ${x.directorate}`));
  }

  // ── 4. CihazEnvanter daire adlarını da normalize et ───────────────────────
  const cihazlar = await prisma.cihazEnvanter.findMany();
  let cihazUpdated = 0;
  for (const c of cihazlar) {
    if (!c.daireBaskanlik) continue;
    const { directorate: newDir } = normalizeDaire(
      // CihazEnvanter'de alan adı daireBaskanlik, aynı map'e bak
      c.daireBaskanlik
    );
    if (newDir && newDir !== c.daireBaskanlik) {
      await prisma.cihazEnvanter.update({
        where: { id: c.id },
        data: { daireBaskanlik: newDir }
      });
      cihazUpdated++;
    }
  }
  console.log(`\nCihazEnvanter daire normalize: ${cihazUpdated}`);

  console.log('\nTamamlandı.');
  await prisma.$disconnect();
}

main().catch(e => { console.error('HATA:', e.message); prisma.$disconnect(); });
