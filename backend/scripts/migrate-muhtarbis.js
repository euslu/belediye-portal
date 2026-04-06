'use strict';
/**
 * Muhtarbis MSSQL → PostgreSQL veri taşıma scripti
 * Çalıştır: node backend/scripts/migrate-muhtarbis.js
 */
require('dotenv').config();
const prisma = require('../lib/prisma');
const sql = require('mssql');

const mssqlConfig = {
  server: process.env.MUHTARBIS_HOST || '10.5.2.69',
  port:   +(process.env.MUHTARBIS_PORT || 3322),
  database: process.env.MUHTARBIS_DB || 'Muhtarbis',
  authentication: {
    type: 'ntlm',
    options: {
      domain:   process.env.MUHTARBIS_DOMAIN   || 'MUGLABB',
      userName: process.env.MUHTARBIS_USER,
      password: process.env.MUHTARBIS_PASS,
    },
  },
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
  connectionTimeout: 30000,
};

// ─── 1. Muhtar bilgileri ───────────────────────────────────────────────────
async function migrateMuhtarlar(pool) {
  console.log('\n=== MUHTARLAR taşınıyor ===');

  const result = await pool.request().query(`
    SELECT
      m.AD_1   AS ilce,
      m.AD     AS mahalle,
      m.MUHTAR_ADI,
      m.ILETISI_NO,
      m.NUFUS,
      m.MAHALLE_UAVT,
      m.MUHTAR_OFISI,
      m.SAGLIK_OCAGI,
      m.DINI_TESIS,
      m.OKUL,
      m.HASTANE,
      m.SOSYAL_TESIS,
      m.COCUK_OYUN,
      m.SPOR_TESISI,
      CAST(m.GLOBALID AS NVARCHAR(50)) AS GLOBALID
    FROM MUHTARLIK_MAHALLE m
    WHERE (m.GDB_TO_DATE IS NULL OR YEAR(m.GDB_TO_DATE) > 2100)
    ORDER BY m.AD_1, m.AD
  `);

  let islenen = 0;
  for (const r of result.recordset) {
    if (!r.ilce || !r.mahalle) continue;
    try {
      await prisma.muhtar.upsert({
        where: { ilce_mahalle: { ilce: r.ilce, mahalle: r.mahalle } },
        create: {
          ilce:              r.ilce,
          mahalle:           r.mahalle,
          muhtarAdi:         r.MUHTAR_ADI || '',
          gsm:               r.ILETISI_NO  || null,
          nufus:             r.NUFUS       || null,
          uavt:              r.MAHALLE_UAVT || null,
          muhtarOfisi:       r.MUHTAR_OFISI  || null,
          saglikOcagi:       r.SAGLIK_OCAGI  || null,
          diniTesis:         r.DINI_TESIS    || null,
          okul:              r.OKUL          || null,
          hastane:           r.HASTANE       || null,
          sosyalTesis:       r.SOSYAL_TESIS  || null,
          cocukOyun:         r.COCUK_OYUN    || null,
          sporTesisi:        r.SPOR_TESISI   || null,
          muhtarbisGlobalId: r.GLOBALID      || null,
        },
        update: {
          muhtarAdi:   r.MUHTAR_ADI    || '',
          gsm:         r.ILETISI_NO   || null,
          nufus:       r.NUFUS        || null,
          muhtarOfisi: r.MUHTAR_OFISI || null,
          saglikOcagi: r.SAGLIK_OCAGI || null,
          diniTesis:   r.DINI_TESIS   || null,
          okul:        r.OKUL         || null,
          hastane:     r.HASTANE      || null,
          sosyalTesis: r.SOSYAL_TESIS || null,
          cocukOyun:   r.COCUK_OYUN   || null,
          sporTesisi:  r.SPOR_TESISI  || null,
        },
      });
      islenen++;
    } catch (e) {
      console.error(`  Hata (${r.ilce}/${r.mahalle}): ${e.message}`);
    }
  }
  console.log(`  ${islenen} muhtar kaydı işlendi`);
  return islenen;
}

// ─── 2. Başvurular ─────────────────────────────────────────────────────────
async function migrateBasvurular(pool) {
  console.log('\n=== BAŞVURULAR taşınıyor ===');

  const DATE_FILTER = "BASVURU_TA IS NOT NULL";

  const sayimRes = await pool.request().query(
    `SELECT COUNT(*) AS toplam FROM view_Mahalle_Basvuru_AtananIs WHERE ${DATE_FILTER}`
  );
  const toplam = sayimRes.recordset[0].toplam;
  console.log(`  Toplam: ${toplam} başvuru`);

  const BATCH = 1000;
  let offset = 0, eklenen = 0, atlanan = 0;

  while (offset < toplam) {
    const result = await pool.request().query(`
      SELECT
        CAST(OBJECTID AS NVARCHAR(50)) AS muhtarbisId,
        ISNULL(MAHALLE_AD_1, '') AS ilce,
        ISNULL(MAHALLE_AD, '')   AS mahalle,
        ISNULL(MUHTAR_ADI, '')   AS MUHTAR_ADI,
        ISNULL(BASVURU_TU, '')   AS basvuruTuru,
        ISNULL(KONUSU, '')       AS konu,
        ISNULL(TALEP_GENE, '')   AS aciklama,
        ISNULL(DAIRE_BASK_ADI, '') AS daire,
        ISNULL(BIRIM_ISLE, '')   AS durum,
        ISNULL(BIRIM_CEVA, '')   AS cevap,
        CONVERT(NVARCHAR(30), BASVURU_TA, 120) AS tarih
      FROM view_Mahalle_Basvuru_AtananIs
      WHERE ${DATE_FILTER}
      ORDER BY OBJECTID
      OFFSET ${offset} ROWS FETCH NEXT ${BATCH} ROWS ONLY
    `);

    for (const r of result.recordset) {
      if (!r.ilce || !r.mahalle || !r.muhtarbisId) continue;
      try {
        // Zaten varsa atla
        const mevcut = await prisma.basvuru.findFirst({ where: { muhtarbisId: r.muhtarbisId }, select: { id: true } });
        if (mevcut) { atlanan++; continue; }

        await prisma.basvuru.create({
          data: {
            muhtarbisId: r.muhtarbisId,
            ilce:        r.ilce,
            mahalle:     r.mahalle,
            muhtarAdi:   r.MUHTAR_ADI  || null,
            basvuruTuru: r.basvuruTuru || null,
            konu:        r.konu        || 'Belirtilmemiş',
            aciklama:    r.aciklama    || null,
            daire:       r.daire       || null,
            durum:       r.durum       || 'Beklemede',
            cevap:       r.cevap && r.cevap instanceof Date ? null
                         : (typeof r.cevap === 'string' && r.cevap.trim() ? r.cevap.trim() : null),
            tarih:       r.tarih ? new Date(r.tarih) : new Date(),
            giren:       'sistem',
            girenAd:     'Muhtarbis Aktarım',
            kaynak:      'muhtarbis',
          },
        });
        eklenen++;
      } catch (e) {
        console.error(`  Hata (${r.muhtarbisId}): ${e.message}`);
      }
    }

    offset += BATCH;
    process.stdout.write(`\r  İşlendi: ${Math.min(offset, toplam)}/${toplam} (yeni: ${eklenen}, atlanan: ${atlanan})`);
  }
  console.log(`\n  Başvurular: ${eklenen} yeni kayıt eklendi, ${atlanan} mevcut atlandı`);
  return eklenen;
}

// ─── Ana fonksiyon ─────────────────────────────────────────────────────────
async function main() {
  console.log('Muhtarbis → PostgreSQL veri taşıma başlıyor...');
  console.log(`MSSQL: ${mssqlConfig.server}:${mssqlConfig.port}/${mssqlConfig.database}`);

  let pool;
  try {
    pool = await sql.connect(mssqlConfig);
    console.log('MSSQL bağlantısı OK');

    const t0 = Date.now();
    await migrateMuhtarlar(pool);
    await migrateBasvurular(pool);

    const sure = Math.round((Date.now() - t0) / 1000);
    console.log(`\n✅ TAMAMLANDI (${sure} saniye)`);
  } catch (e) {
    console.error('\n❌ HATA:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    try { await sql.close(); } catch (_) {}
  }
}

main();
