const sql    = require('mssql');
const prisma = require('../lib/prisma');
const path   = require('path');

let _pool = null;

function getConfig() {
  return {
    server:   process.env.MUHTARBIS_HOST || '10.5.2.69',
    port:     +(process.env.MUHTARBIS_PORT || 3322),
    database: process.env.MUHTARBIS_DB || 'Muhtarbis',
    authentication: {
      type: 'ntlm',
      options: {
        domain:   process.env.MUHTARBIS_DOMAIN || 'MUGLABB',
        userName: process.env.MUHTARBIS_USER   || 'ethem.usluoglu',
        password: process.env.MUHTARBIS_PASS,
      },
    },
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
    connectionTimeout: 15000,
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
  };
}

async function getPool() {
  if (_pool && _pool.connected) return _pool;
  _pool = await sql.connect(getConfig());
  return _pool;
}

// ─── Tablo adı keşfi (bir kez çalışır, sonucu cache'ler) ─────────────────────
let _tableCache = null;
async function getBaseTables() {
  if (_tableCache) return _tableCache;
  const p = await getPool();
  // BIRIM_ISLE kolonuna sahip tablo → BIRIM_IS tablosu
  // KONUSU kolonuna sahip tablo     → BASVURU tablosu
  const r = await p.request().query(`
    SELECT TABLE_NAME, COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE COLUMN_NAME IN ('BIRIM_ISLE','KONUSU','TALEP_GENE','DAIRE_BASK_ADI','BIRIM_CEVA')
      AND TABLE_NAME NOT LIKE 'view_%'
    ORDER BY TABLE_NAME, COLUMN_NAME
  `);
  const tbl = {};
  for (const row of r.recordset) {
    if (!tbl[row.TABLE_NAME]) tbl[row.TABLE_NAME] = [];
    tbl[row.TABLE_NAME].push(row.COLUMN_NAME);
  }
  // Hangi tablo hangi alanı içeriyor
  let basvuruTable = null, birimTable = null;
  for (const [name, cols] of Object.entries(tbl)) {
    if (cols.includes('KONUSU'))    basvuruTable = name;
    if (cols.includes('BIRIM_ISLE')) birimTable  = name;
  }
  _tableCache = { basvuruTable, birimTable };
  return _tableCache;
}

// ─── Özet istatistikler ────────────────────────────────────────────────────
async function getStats({ yil } = {}) {
  const p = await getPool();
  const req = p.request();
  const yilFilter = yil
    ? `YEAR(BASVURU_TA) = ${+yil}`
    : 'YEAR(BASVURU_TA) BETWEEN 2020 AND 2027';

  const r = await req.query(`
    SELECT
      COUNT(*)                                                             AS toplam,
      SUM(CASE WHEN BIRIM_ISLE = 'Tamamlandı'   THEN 1 ELSE 0 END)       AS tamamlandi,
      SUM(CASE WHEN BIRIM_ISLE = 'Devam Etmekte' THEN 1 ELSE 0 END)      AS devam,
      SUM(CASE WHEN BIRIM_ISLE = 'Tamamlanmadı' THEN 1 ELSE 0 END)       AS tamamlanmadi,
      SUM(CASE WHEN BIRIM_ISLE = 'Beklemede'    THEN 1 ELSE 0 END)       AS beklemede,
      SUM(CASE WHEN BIRIM_ISLE IS NULL          THEN 1 ELSE 0 END)       AS atanmamis,
      ROUND(AVG(CAST(CEVAP_SURE AS FLOAT)), 1)                           AS ort_sure
    FROM view_Mahalle_Basvuru_AtananIs
    WHERE ${yilFilter}
  `);
  return r.recordset[0];
}

// ─── Daire bazlı dağılım ───────────────────────────────────────────────────
async function getDaireDagilim({ yil } = {}) {
  const p = await getPool();
  const yilFilter = yil
    ? `YEAR(BASVURU_TA) = ${+yil}`
    : 'YEAR(BASVURU_TA) BETWEEN 2020 AND 2027';

  const r = await p.request().query(`
    SELECT
      ISNULL(DAIRE_BASK_ADI, 'Diğer / Tanımsız') AS daire,
      COUNT(*)                                              AS toplam,
      SUM(CASE WHEN BIRIM_ISLE = 'Tamamlandı'   THEN 1 ELSE 0 END) AS tamamlandi,
      SUM(CASE WHEN BIRIM_ISLE = 'Devam Etmekte' THEN 1 ELSE 0 END) AS devam,
      SUM(CASE WHEN BIRIM_ISLE = 'Tamamlanmadı' THEN 1 ELSE 0 END) AS tamamlanmadi
    FROM view_Mahalle_Basvuru_AtananIs
    WHERE ${yilFilter}
    GROUP BY DAIRE_BASK_ADI
    ORDER BY toplam DESC
  `);
  return r.recordset;
}

// ─── İlçe bazlı dağılım ───────────────────────────────────────────────────
async function getIlceDagilim({ yil } = {}) {
  const p = await getPool();
  const yilFilter = yil
    ? `YEAR(BASVURU_TA) = ${+yil}`
    : 'YEAR(BASVURU_TA) BETWEEN 2020 AND 2027';

  const r = await p.request().query(`
    SELECT
      ISNULL(MAHALLE_AD_1, 'Bilinmiyor') AS ilce,
      COUNT(*) AS toplam,
      SUM(CASE WHEN BIRIM_ISLE = 'Tamamlandı'   THEN 1 ELSE 0 END) AS tamamlandi,
      SUM(CASE WHEN BIRIM_ISLE = 'Devam Etmekte' THEN 1 ELSE 0 END) AS devam
    FROM view_Mahalle_Basvuru_AtananIs
    WHERE ${yilFilter}
    GROUP BY MAHALLE_AD_1
    ORDER BY toplam DESC
  `);
  return r.recordset;
}

// ─── Filtreli liste ────────────────────────────────────────────────────────
const SELECT_COLS = `
  OBJECTID, BASVURU_OBJECTID, BIRIM_IS_OBJECTID,
  MAHALLE_AD, MAHALLE_AD_1,
  MUHTAR_ADI,
  BASVURU_TU, BASVURU_TA,
  KONUSU, TALEP_GENE,
  DAIRE_BASK_ADI,
  BIRIM_TALE, BIRIM_ISLE, BIRIM_CEVA, BIRIM_CE_2,
  CEVAP_SURE,
  BASVURU_created_date
`;

async function getListe({ ilce, mahalle, daire, durum, tur, yil, q, sayfa = 1, limit = 50 } = {}) {
  const p  = await getPool();
  const offset = (Math.max(1, +sayfa) - 1) * +limit;

  const conds = ['YEAR(BASVURU_TA) BETWEEN 2020 AND 2027'];
  const params = {};

  if (ilce)    { conds.push("MAHALLE_AD_1   = @ilce");    params.ilce    = { type: sql.NVarChar, val: ilce    }; }
  if (mahalle) { conds.push("MAHALLE_AD     = @mahalle"); params.mahalle = { type: sql.NVarChar, val: mahalle }; }
  if (daire)   { conds.push("DAIRE_BASK_ADI = @daire");   params.daire   = { type: sql.VarChar,  val: daire   }; }
  if (durum)   { conds.push("BIRIM_ISLE     = @durum");   params.durum   = { type: sql.NVarChar, val: durum   }; }
  if (tur)     { conds.push("BASVURU_TU     = @tur");     params.tur     = { type: sql.NVarChar, val: tur     }; }
  if (yil)     { conds.push("YEAR(BASVURU_TA) = @yil");  params.yil     = { type: sql.Int,      val: +yil    }; }
  if (q)       { conds.push("(KONUSU LIKE @q OR TALEP_GENE LIKE @q OR MUHTAR_ADI LIKE @q)"); params.q = { type: sql.NVarChar, val: `%${q}%` }; }

  const where = 'WHERE ' + conds.join(' AND ');

  function buildReq() {
    const r = p.request();
    Object.entries(params).forEach(([k, { type, val }]) => r.input(k, type, val));
    return r;
  }

  const [countRes, dataRes] = await Promise.all([
    buildReq().query(`SELECT COUNT(*) AS n FROM view_Mahalle_Basvuru_AtananIs ${where}`),
    buildReq().query(`
      SELECT ${SELECT_COLS}
      FROM view_Mahalle_Basvuru_AtananIs
      ${where}
      ORDER BY BASVURU_TA DESC
      OFFSET ${offset} ROWS FETCH NEXT ${+limit} ROWS ONLY
    `),
  ]);

  return {
    toplam: countRes.recordset[0].n,
    sayfa:  +sayfa,
    limit:  +limit,
    rows:   dataRes.recordset,
  };
}

// ─── Filtre seçenekleri ────────────────────────────────────────────────────
async function getFilterOptions({ ilce } = {}) {
  const p = await getPool();
  const [ilceler, daireler, yillar] = await Promise.all([
    p.request().query("SELECT DISTINCT MAHALLE_AD_1 AS v FROM view_Mahalle_Basvuru_AtananIs WHERE MAHALLE_AD_1 IS NOT NULL ORDER BY MAHALLE_AD_1"),
    p.request().query("SELECT DISTINCT DAIRE_BASK_ADI AS v FROM view_Mahalle_Basvuru_AtananIs WHERE DAIRE_BASK_ADI IS NOT NULL ORDER BY DAIRE_BASK_ADI"),
    p.request().query("SELECT DISTINCT YEAR(BASVURU_TA) AS v FROM view_Mahalle_Basvuru_AtananIs WHERE YEAR(BASVURU_TA) BETWEEN 2020 AND 2027 ORDER BY v DESC"),
  ]);

  // Mahalleler — ilçe filtreli veya tüm
  let mahallelerQuery;
  if (ilce) {
    const req = p.request();
    req.input('ilce', sql.NVarChar, ilce);
    mahallelerQuery = req.query("SELECT DISTINCT MAHALLE_AD AS v FROM view_Mahalle_Basvuru_AtananIs WHERE MAHALLE_AD_1 = @ilce AND MAHALLE_AD IS NOT NULL ORDER BY MAHALLE_AD");
  } else {
    mahallelerQuery = p.request().query("SELECT DISTINCT MAHALLE_AD AS v FROM view_Mahalle_Basvuru_AtananIs WHERE MAHALLE_AD IS NOT NULL ORDER BY MAHALLE_AD");
  }
  const mahalleler = await mahallelerQuery;

  return {
    ilceler:    ilceler.recordset.map(r => r.v),
    mahalleler: mahalleler.recordset.map(r => r.v),
    daireler:   daireler.recordset.map(r => r.v),
    yillar:     yillar.recordset.map(r => r.v),
    durumlar:   ['Tamamlandı', 'Devam Etmekte', 'Tamamlanmadı', 'Beklemede'],
    turler:     ['İş Emri', 'Dilekçe'],
  };
}

// ─── Mahalle detay özet ────────────────────────────────────────────────────
async function getMahalleDetay({ ilce, mahalle }) {
  const p = await getPool();
  const req = p.request();
  req.input('ilce',    sql.NVarChar, ilce);
  req.input('mahalle', sql.NVarChar, mahalle);

  const r = await req.query(`
    SELECT TOP 1
      MAHALLE_AD, MAHALLE_AD_1, MUHTAR_ADI,
      COUNT(*) OVER() AS toplam,
      SUM(CASE WHEN BIRIM_ISLE='Tamamlandı'   THEN 1 ELSE 0 END) OVER() AS tamamlandi,
      SUM(CASE WHEN BIRIM_ISLE='Devam Etmekte' THEN 1 ELSE 0 END) OVER() AS devam,
      SUM(CASE WHEN BIRIM_ISLE='Tamamlanmadı' THEN 1 ELSE 0 END) OVER() AS tamamlanmadi,
      SUM(CASE WHEN BIRIM_ISLE='Beklemede'    THEN 1 ELSE 0 END) OVER() AS beklemede,
      ROUND(AVG(CAST(CEVAP_SURE AS FLOAT)) OVER(), 1) AS ort_sure
    FROM view_Mahalle_Basvuru_AtananIs
    WHERE MAHALLE_AD_1 = @ilce AND MAHALLE_AD = @mahalle
  `);

  const row = r.recordset[0] || {};

  // yatirimlar.json'dan muhtar bilgisini de al
  let muhtarBilgi = null;
  try {
    const dataPath = path.join(__dirname, '../data/yatirimlar.json');
    const veri = require(dataPath);
    const ilceKey = ilce.toUpperCase().replace('I', 'İ');
    // Normalize ile eşleştir
    const ilceData = veri[ilce] || veri[ilceKey] || null;
    if (ilceData) {
      const mahalleData = ilceData[mahalle] || ilceData[mahalle.toUpperCase()] || null;
      if (mahalleData && Array.isArray(mahalleData)) {
        muhtarBilgi = {
          ad:     mahalleData[0],
          nufus:  mahalleData[1],
          kirsal: mahalleData[2],
        };
      }
    }
  } catch (_) {}

  return {
    ilce:         row.MAHALLE_AD_1 || ilce,
    mahalle:      row.MAHALLE_AD   || mahalle,
    muhtar:       row.MUHTAR_ADI   || null,
    muhtarBilgi,
    istatistik: {
      toplam:       row.toplam       || 0,
      tamamlandi:   row.tamamlandi   || 0,
      devam:        row.devam        || 0,
      tamamlanmadi: row.tamamlanmadi || 0,
      beklemede:    row.beklemede    || 0,
      ort_sure:     row.ort_sure     || null,
    },
  };
}

// ─── Mahalle başvuru listesi ───────────────────────────────────────────────
async function getMahalleBasvurular({ ilce, mahalle, durum, sayfa = 1, limit = 50 } = {}) {
  const p      = await getPool();
  const offset = (Math.max(1, +sayfa) - 1) * +limit;
  const conds  = ['MAHALLE_AD_1 = @ilce', 'MAHALLE_AD = @mahalle'];
  const req    = p.request();
  req.input('ilce',    sql.NVarChar, ilce);
  req.input('mahalle', sql.NVarChar, mahalle);
  if (durum) { conds.push('BIRIM_ISLE = @durum'); req.input('durum', sql.NVarChar, durum); }

  const where = 'WHERE ' + conds.join(' AND ');

  const [cnt, rows] = await Promise.all([
    p.request()
      .input('ilce',    sql.NVarChar, ilce)
      .input('mahalle', sql.NVarChar, mahalle)
      .query(`SELECT COUNT(*) AS n FROM view_Mahalle_Basvuru_AtananIs ${where}`),
    req.query(`
      SELECT ${SELECT_COLS}
      FROM view_Mahalle_Basvuru_AtananIs
      ${where}
      ORDER BY BASVURU_TA DESC
      OFFSET ${offset} ROWS FETCH NEXT ${+limit} ROWS ONLY
    `),
  ]);

  return {
    toplam: cnt.recordset[0].n,
    sayfa:  +sayfa,
    limit:  +limit,
    rows:   rows.recordset,
  };
}

// ─── Mahalle yatırımları (yatirimlar.json'dan) ────────────────────────────
function getMahalleYatirimlar({ ilce, mahalle }) {
  try {
    const dataPath = path.join(__dirname, '../data/yatirimlar.json');
    delete require.cache[require.resolve(dataPath)];
    const veri = require(dataPath);
    const ilceData = veri[ilce];
    if (!ilceData) return [];
    const mahalleData = ilceData[mahalle];
    if (!mahalleData || !Array.isArray(mahalleData[3])) return [];
    return mahalleData[3].map(t => ({
      tarih:         t[0],
      tarih_sort:    t[1],
      talep:         t[2],
      daire:         t[3],
      cevap:         t[4],
      durum:         t[5],
      tahmini_bedel: t[6] || '',
    }));
  } catch (_) {
    return [];
  }
}

// ─── Yatırım güncelle (yatirimlar.json) ───────────────────────────────────
async function updateYatirim({ ilce, mahalle, index, fields, user }) {
  const fs       = require('fs');
  const dataPath = path.join(__dirname, '../data/yatirimlar.json');
  const veri     = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // Mahalle bul — tam eşleşme, sonra MAHALLESİ toleransı
  const ilceData = veri[ilce];
  if (!ilceData) throw new Error(`İlçe bulunamadı: ${ilce}`);

  let mahalleKey = mahalle;
  if (!ilceData[mahalleKey]) {
    // MAHALLESİ eki varsa soy
    const stripped = mahalle.replace(/\s+MAHALLESİ$/i, '').trim();
    if (ilceData[stripped]) {
      mahalleKey = stripped;
    } else {
      // Tersine: JSON'da MAHALLESİ ekli varsa
      const withSuffix = mahalle + ' MAHALLESİ';
      if (ilceData[withSuffix]) mahalleKey = withSuffix;
      else throw new Error(`Mahalle bulunamadı: ${mahalle}`);
    }
  }

  const mahalleData = ilceData[mahalleKey];
  if (!Array.isArray(mahalleData[3])) throw new Error('Talep listesi bulunamadı');

  const idx = parseInt(index);
  if (idx < 0 || idx >= mahalleData[3].length) throw new Error('Geçersiz index');

  const eskiKayit = [...mahalleData[3][idx]];
  const talep     = mahalleData[3][idx];

  // [0]=tarih [1]=tarih_sort [2]=aciklama [3]=daire [4]=cevap [5]=durum [6]=tahmini_bedel
  if (fields.aciklama      !== undefined) talep[2] = fields.aciklama;
  if (fields.daire         !== undefined) talep[3] = fields.daire;
  if (fields.cevap         !== undefined) talep[4] = fields.cevap;
  if (fields.durum         !== undefined) talep[5] = fields.durum;
  if (fields.tahmini_bedel !== undefined) talep[6] = fields.tahmini_bedel;

  fs.writeFileSync(dataPath, JSON.stringify(veri, null, 2), 'utf8');

  // Log kaydet
  await prisma.muhtarbisEditLog.create({
    data: {
      objectId:     idx,
      alan:         'yatirim',
      eskiDeger:    JSON.stringify(eskiKayit),
      yeniDeger:    JSON.stringify(talep),
      duzenleyenId: String(user.id || user.username),
      duzenleyenAd: user.displayName || user.username,
    },
  });

  return { success: true };
}

// ─── Başvuru güncelle (Muhtarbis MSSQL) ───────────────────────────────────
async function updateBasvuru({ objectId, fields }) {
  const p = await getPool();

  // Önce mevcut değerleri al
  const curReq = p.request();
  curReq.input('oid', sql.Int, +objectId);
  const cur = await curReq.query(`
    SELECT OBJECTID, BASVURU_OBJECTID, BIRIM_IS_OBJECTID,
           KONUSU, TALEP_GENE, DAIRE_BASK_ADI, BIRIM_ISLE, BIRIM_CEVA
    FROM view_Mahalle_Basvuru_AtananIs
    WHERE OBJECTID = @oid
  `);
  if (!cur.recordset.length) throw new Error('Kayıt bulunamadı');
  const current = cur.recordset[0];

  // Tablo adlarını keşfet
  const { basvuruTable, birimTable } = await getBaseTables();

  const changes = {}; // alan → { eski, yeni }
  const basvuruFields = {}; // KONUSU, TALEP_GENE
  const birimFields   = {}; // DAIRE_BASK_ADI, BIRIM_ISLE, BIRIM_CEVA

  const allowed = {
    KONUSU:        'basvuru',
    TALEP_GENE:    'basvuru',
    DAIRE_BASK_ADI:'birim',
    BIRIM_ISLE:    'birim',
    BIRIM_CEVA:    'birim',
  };

  for (const [alan, val] of Object.entries(fields)) {
    if (!allowed[alan]) continue;
    const eski = current[alan] ?? null;
    const yeni = val ?? null;
    if (String(eski) === String(yeni)) continue; // değişmedi
    changes[alan] = { eski, yeni };
    if (allowed[alan] === 'basvuru') basvuruFields[alan] = yeni;
    else                             birimFields[alan]   = yeni;
  }

  if (!Object.keys(changes).length) return { degisiklik: false, changes: {} };

  // BASVURU tablosu güncelle
  if (basvuruTable && Object.keys(basvuruFields).length) {
    const sets = Object.keys(basvuruFields).map((k, i) => `${k} = @b${i}`).join(', ');
    const req = p.request();
    req.input('bid', sql.Int, current.BASVURU_OBJECTID);
    Object.values(basvuruFields).forEach((v, i) => req.input(`b${i}`, sql.NVarChar, v));
    await req.query(`UPDATE ${basvuruTable} SET ${sets} WHERE OBJECTID = @bid`);
  }

  // BIRIM tablosu güncelle
  if (birimTable && Object.keys(birimFields).length && current.BIRIM_IS_OBJECTID) {
    const sets = Object.keys(birimFields).map((k, i) => `${k} = @m${i}`).join(', ');
    const req = p.request();
    req.input('mid', sql.Int, current.BIRIM_IS_OBJECTID);
    Object.values(birimFields).forEach((v, i) => req.input(`m${i}`, sql.NVarChar, v));
    await req.query(`UPDATE ${birimTable} SET ${sets} WHERE OBJECTID = @mid`);
  }

  return { degisiklik: true, changes };
}

// ─── Edit log kaydet (PostgreSQL) ─────────────────────────────────────────
async function saveEditLog({ objectId, changes, user }) {
  const entries = Object.entries(changes).map(([alan, { eski, yeni }]) => ({
    objectId:     +objectId,
    alan,
    eskiDeger:    eski != null ? String(eski) : null,
    yeniDeger:    yeni != null ? String(yeni) : null,
    duzenleyenId: String(user.id || user.username),
    duzenleyenAd: user.displayName || user.username,
  }));
  await prisma.muhtarbisEditLog.createMany({ data: entries });
}

// ─── Edit log getir ────────────────────────────────────────────────────────
async function getEditLog(objectId) {
  return prisma.muhtarbisEditLog.findMany({
    where:   { objectId: +objectId },
    orderBy: { tarih: 'desc' },
  });
}

module.exports = {
  getStats, getDaireDagilim, getIlceDagilim,
  getListe, getFilterOptions,
  getMahalleDetay, getMahalleBasvurular, getMahalleYatirimlar,
  updateBasvuru, saveEditLog, getEditLog,
  updateYatirim,
};
