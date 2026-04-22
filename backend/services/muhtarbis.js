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
  if (_pool) {
    try { await _pool.close(); } catch {}
    _pool = null;
  }
  const p = new sql.ConnectionPool(getConfig());
  p.on('error', () => { if (_pool === p) _pool = null; });
  await p.connect();
  _pool = p;
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

// ─── Yeni başvuru ekle (Muhtarbis MSSQL) ──────────────────────────────────
async function createBasvuru({ ilce, mahalle, konu, aciklama, daire, tur, tarih }) {
  const p = await getPool();
  const { basvuruTable } = await getBaseTables();
  if (!basvuruTable) throw new Error('Başvuru tablosu bulunamadı');

  // Tablo sütunlarını keşfet
  const colRes = await p.request().query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '${basvuruTable}'
    ORDER BY ORDINAL_POSITION
  `);
  const cols = colRes.recordset.map(r => r.COLUMN_NAME.toUpperCase());

  const tarihVal = tarih ? new Date(tarih) : new Date();
  const colMap   = {};
  if (cols.includes('KONUSU')         && konu)    colMap.KONUSU         = { type: sql.NVarChar, val: konu };
  if (cols.includes('TALEP_GENE')     && aciklama) colMap.TALEP_GENE    = { type: sql.NVarChar, val: aciklama };
  if (cols.includes('BASVURU_TU')     && tur)      colMap.BASVURU_TU    = { type: sql.NVarChar, val: tur };
  if (cols.includes('BASVURU_TA'))                 colMap.BASVURU_TA    = { type: sql.DateTime,  val: tarihVal };
  if (cols.includes('MAHALLE_AD')     && mahalle)  colMap.MAHALLE_AD    = { type: sql.NVarChar, val: mahalle };
  if (cols.includes('MAHALLE_AD_1')   && ilce)     colMap.MAHALLE_AD_1  = { type: sql.NVarChar, val: ilce };
  if (cols.includes('DAIRE_BASK_ADI') && daire)    colMap.DAIRE_BASK_ADI = { type: sql.NVarChar, val: daire };

  if (!Object.keys(colMap).length) throw new Error('Insert için uygun alan bulunamadı');

  const colNames  = Object.keys(colMap).join(', ');
  const paramList = Object.keys(colMap).map((_, i) => `@f${i}`).join(', ');
  const req = p.request();
  Object.values(colMap).forEach(({ type, val }, i) => req.input(`f${i}`, type, val));

  const result = await req.query(
    `INSERT INTO ${basvuruTable} (${colNames}) OUTPUT INSERTED.OBJECTID AS newId VALUES (${paramList})`
  );
  return { success: true, id: result.recordset?.[0]?.newId || null };
}

// ─── Yeni yatırım ekle (yatirimlar.json) ──────────────────────────────────
async function createYatirim({ ilce, mahalle, aciklama, tahmini_bedel, daire, durum, tarih, user }) {
  const fs       = require('fs');
  const dataPath = path.join(__dirname, '../data/yatirimlar.json');
  const veri     = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const ilceData = veri[ilce];
  if (!ilceData) throw new Error(`İlçe bulunamadı: ${ilce}`);

  // Toleranslı mahalle eşleştirme
  let mahalleKey = mahalle;
  if (!ilceData[mahalleKey]) {
    const stripped = mahalle.replace(/\s+MAHALLESİ$/i, '').trim();
    if (ilceData[stripped]) {
      mahalleKey = stripped;
    } else {
      const withSuffix = mahalle + ' MAHALLESİ';
      if (ilceData[withSuffix]) mahalleKey = withSuffix;
      else throw new Error(`Mahalle bulunamadı: ${mahalle}`);
    }
  }

  const mahalleData = ilceData[mahalleKey];
  if (!Array.isArray(mahalleData[3])) mahalleData[3] = [];

  // Tarih formatla: DD.MM.YYYY (görüntü) + YYYY-MM-DD (sıralama)
  const tarihIso  = tarih || new Date().toISOString().split('T')[0];
  const [y, m, d] = tarihIso.split('-');
  const tarihGoru = `${d}.${m}.${y}`;

  // [tarih, tarih_sort, aciklama, daire, cevap, durum, tahmini_bedel]
  const yeniKayit = [tarihGoru, tarihIso, aciklama || '', daire || '', '', durum || 'İşlemde', tahmini_bedel || ''];
  mahalleData[3].push(yeniKayit);

  fs.writeFileSync(dataPath, JSON.stringify(veri, null, 2), 'utf8');

  await prisma.muhtarbisEditLog.create({
    data: {
      objectId:     0,
      alan:         'yatirim_yeni',
      eskiDeger:    null,
      yeniDeger:    JSON.stringify(yeniKayit),
      duzenleyenId: String(user?.id || user?.username || 'system'),
      duzenleyenAd: user?.displayName || user?.username || 'system',
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

// ─── Rapor: yatırım ilçe özeti (senkron — sadece JSON) ────────────────────
function getRaporYatirimOzet() {
  const fs       = require('fs');
  const dataPath = path.join(__dirname, '../data/yatirimlar.json');
  const veri     = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const result = [];
  for (const [ilce, mahalleler] of Object.entries(veri)) {
    let toplamMahalle = 0, toplamYatirim = 0, tamamlanan = 0;
    for (const mahalleData of Object.values(mahalleler)) {
      toplamMahalle++;
      const talepler = Array.isArray(mahalleData[3]) ? mahalleData[3] : [];
      toplamYatirim += talepler.length;
      tamamlanan    += talepler.filter(t => t[5] === 'Tamamlandı').length;
    }
    result.push({
      ilce,
      toplamMahalle,
      toplamYatirim,
      tamamlanan,
      tamamlanmaOrani: toplamYatirim > 0 ? Math.round((tamamlanan / toplamYatirim) * 100) : 0,
    });
  }
  return result.sort((a, b) => a.ilce.localeCompare(b.ilce, 'tr'));
}

// ─── Rapor: genel özet ─────────────────────────────────────────────────────
async function getRaporOzet() {
  const p = await getPool();
  const fs = require('fs');

  // MSSQL başvuru özeti
  const r = await p.request().query(`
    SELECT
      COUNT(*)                                                           AS toplamBasvuru,
      SUM(CASE WHEN BIRIM_ISLE = 'Tamamlandı'    THEN 1 ELSE 0 END)    AS tamamlandi,
      SUM(CASE WHEN BIRIM_ISLE = 'Devam Etmekte' THEN 1 ELSE 0 END)    AS devamEtmekte,
      SUM(CASE WHEN BIRIM_ISLE = 'Tamamlanmadı'  THEN 1 ELSE 0 END)    AS tamamlanmadi,
      SUM(CASE WHEN BIRIM_ISLE = 'Beklemede'     THEN 1 ELSE 0 END)    AS beklemede,
      ROUND(AVG(CAST(CEVAP_SURE AS FLOAT)), 1)                         AS ortSure
    FROM view_Mahalle_Basvuru_AtananIs
    WHERE YEAR(BASVURU_TA) BETWEEN 2020 AND 2027
  `);

  // Top 5 daire
  const daire = await p.request().query(`
    SELECT TOP 5
      ISNULL(DAIRE_BASK_ADI, 'Diğer') AS daire,
      COUNT(*) AS toplam
    FROM view_Mahalle_Basvuru_AtananIs
    WHERE YEAR(BASVURU_TA) BETWEEN 2020 AND 2027
    GROUP BY DAIRE_BASK_ADI
    ORDER BY toplam DESC
  `);

  // İlçe dağılım
  const ilce = await p.request().query(`
    SELECT
      ISNULL(MAHALLE_AD_1, 'Bilinmiyor') AS ilce,
      COUNT(*) AS toplam
    FROM view_Mahalle_Basvuru_AtananIs
    WHERE YEAR(BASVURU_TA) BETWEEN 2020 AND 2027
    GROUP BY MAHALLE_AD_1
    ORDER BY toplam DESC
  `);

  // Yatırım sayısı (JSON)
  let toplamYatirim = 0;
  try {
    const dataPath = path.join(__dirname, '../data/yatirimlar.json');
    const veri = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    for (const ilceData of Object.values(veri)) {
      for (const mahalleData of Object.values(ilceData)) {
        if (Array.isArray(mahalleData[3])) toplamYatirim += mahalleData[3].length;
      }
    }
  } catch (_) {}

  return {
    ...r.recordset[0],
    toplamYatirim,
    ilceDagilim:  ilce.recordset,
    daireDagilim: daire.recordset,
    sonGuncelleme: new Date().toISOString(),
  };
}

// ─── Rapor: ilçe özeti ─────────────────────────────────────────────────────
async function getRaporIlce(ilce) {
  const p = await getPool();
  const req1 = p.request();
  req1.input('ilce', sql.NVarChar, ilce);

  const r = await req1.query(`
    SELECT
      COUNT(*)                                                           AS toplamBasvuru,
      SUM(CASE WHEN BIRIM_ISLE = 'Tamamlandı'    THEN 1 ELSE 0 END)    AS tamamlandi,
      SUM(CASE WHEN BIRIM_ISLE = 'Devam Etmekte' THEN 1 ELSE 0 END)    AS devamEtmekte
    FROM view_Mahalle_Basvuru_AtananIs
    WHERE MAHALLE_AD_1 = @ilce
      AND YEAR(BASVURU_TA) BETWEEN 2020 AND 2027
  `);

  const req2 = p.request();
  req2.input('ilce2', sql.NVarChar, ilce);
  const mahalle = await req2.query(`
    SELECT
      ISNULL(MAHALLE_AD, 'Bilinmiyor') AS mahalle,
      COUNT(*) AS toplam,
      SUM(CASE WHEN BIRIM_ISLE = 'Tamamlandı' THEN 1 ELSE 0 END) AS tamamlandi
    FROM view_Mahalle_Basvuru_AtananIs
    WHERE MAHALLE_AD_1 = @ilce2
      AND YEAR(BASVURU_TA) BETWEEN 2020 AND 2027
    GROUP BY MAHALLE_AD
    ORDER BY toplam DESC
  `);

  const req3 = p.request();
  req3.input('ilce3', sql.NVarChar, ilce);
  const daire = await req3.query(`
    SELECT TOP 5
      ISNULL(DAIRE_BASK_ADI, 'Diğer') AS daire,
      COUNT(*) AS toplam
    FROM view_Mahalle_Basvuru_AtananIs
    WHERE MAHALLE_AD_1 = @ilce3
      AND YEAR(BASVURU_TA) BETWEEN 2020 AND 2027
    GROUP BY DAIRE_BASK_ADI
    ORDER BY toplam DESC
  `);

  return {
    ilce,
    ...r.recordset[0],
    mahalleDagilim: mahalle.recordset,
    topDaireler:    daire.recordset,
  };
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

async function getRaporDonem(tip) {
  const p = await getPool();
  let whereClause, trendQuery;
  if (tip === 'hafta') {
    whereClause = `BASVURU_TA >= DATEADD(day, -7, GETDATE())`;
    trendQuery = `
      SELECT CAST(BASVURU_TA AS DATE) AS gun, COUNT(*) AS toplam,
        SUM(CASE WHEN BIRIM_ISLE = 'Tamamlandı' THEN 1 ELSE 0 END) AS tamamlandi
      FROM view_Mahalle_Basvuru_AtananIs
      WHERE BASVURU_TA >= DATEADD(day, -7, GETDATE())
      GROUP BY CAST(BASVURU_TA AS DATE) ORDER BY gun`;
  } else if (tip === 'yil') {
    whereClause = `YEAR(BASVURU_TA) = YEAR(GETDATE())`;
    trendQuery = `
      SELECT MONTH(BASVURU_TA) AS ay, COUNT(*) AS toplam,
        SUM(CASE WHEN BIRIM_ISLE = 'Tamamlandı' THEN 1 ELSE 0 END) AS tamamlandi
      FROM view_Mahalle_Basvuru_AtananIs
      WHERE YEAR(BASVURU_TA) = YEAR(GETDATE())
      GROUP BY MONTH(BASVURU_TA) ORDER BY ay`;
  } else if (tip === 'gunluk') {
    whereClause = `CAST(BASVURU_TA AS DATE) = CAST(GETDATE() AS DATE)`;
    trendQuery = null;
  } else {
    // ay (default)
    whereClause = `MONTH(BASVURU_TA) = MONTH(GETDATE()) AND YEAR(BASVURU_TA) = YEAR(GETDATE())`;
    trendQuery = `
      SELECT DAY(BASVURU_TA) AS gun, COUNT(*) AS toplam,
        SUM(CASE WHEN BIRIM_ISLE = 'Tamamlandı' THEN 1 ELSE 0 END) AS tamamlandi
      FROM view_Mahalle_Basvuru_AtananIs
      WHERE MONTH(BASVURU_TA) = MONTH(GETDATE()) AND YEAR(BASVURU_TA) = YEAR(GETDATE())
      GROUP BY DAY(BASVURU_TA) ORDER BY gun`;
  }
  const r = await p.request().query(`
    SELECT
      COUNT(*)                                                           AS toplam,
      SUM(CASE WHEN BIRIM_ISLE = 'Tamamlandı'    THEN 1 ELSE 0 END)    AS tamamlandi,
      SUM(CASE WHEN BIRIM_ISLE = 'Devam Etmekte' THEN 1 ELSE 0 END)    AS devam,
      SUM(CASE WHEN BIRIM_ISLE = 'Tamamlanmadı'  THEN 1 ELSE 0 END)    AS tamamlanmadi
    FROM view_Mahalle_Basvuru_AtananIs
    WHERE ${whereClause}
  `);
  const row = r.recordset[0] || {};
  let trend = [];
  if (trendQuery) {
    const tr = await p.request().query(trendQuery);
    trend = tr.recordset;
  }
  return {
    toplam:       row.toplam       || 0,
    tamamlandi:   row.tamamlandi   || 0,
    devam:        row.devam        || 0,
    tamamlanmadi: row.tamamlanmadi || 0,
    trend,
  };
}

// ─── Rapor: aylık karşılaştırma ────────────────────────────────────────────
async function getRaporAylikKarsilastirma(ay1, ay2) {
  // ay1/ay2: 'YYYY-MM'
  const p = await getPool();
  async function ayStats(ayStr) {
    const [yil, ay] = ayStr.split('-').map(Number);
    const req = p.request();
    const r = await req.query(`
      SELECT
        COUNT(*) AS toplam,
        SUM(CASE WHEN BIRIM_ISLE = 'Tamamlandı'    THEN 1 ELSE 0 END) AS tamamlandi,
        SUM(CASE WHEN BIRIM_ISLE = 'Devam Etmekte' THEN 1 ELSE 0 END) AS devam,
        SUM(CASE WHEN BIRIM_ISLE = 'Tamamlanmadı'  THEN 1 ELSE 0 END) AS tamamlanmadi
      FROM view_Mahalle_Basvuru_AtananIs
      WHERE YEAR(BASVURU_TA) = ${yil} AND MONTH(BASVURU_TA) = ${ay}
    `);
    // Daire dağılımı
    const dr = await p.request().query(`
      SELECT TOP 5 ISNULL(DAIRE_BASK_ADI,'Diğer') AS daire, COUNT(*) AS toplam
      FROM view_Mahalle_Basvuru_AtananIs
      WHERE YEAR(BASVURU_TA) = ${yil} AND MONTH(BASVURU_TA) = ${ay}
      GROUP BY DAIRE_BASK_ADI ORDER BY toplam DESC
    `);
    // Haftalık trend içinde
    const tr = await p.request().query(`
      SELECT DAY(BASVURU_TA) AS gun, COUNT(*) AS toplam
      FROM view_Mahalle_Basvuru_AtananIs
      WHERE YEAR(BASVURU_TA) = ${yil} AND MONTH(BASVURU_TA) = ${ay}
      GROUP BY DAY(BASVURU_TA) ORDER BY gun
    `);
    const row = r.recordset[0] || {};
    return {
      ay: ayStr,
      toplam:       row.toplam       || 0,
      tamamlandi:   row.tamamlandi   || 0,
      devam:        row.devam        || 0,
      tamamlanmadi: row.tamamlanmadi || 0,
      oran: row.toplam > 0 ? Math.round(((row.tamamlandi || 0) / row.toplam) * 100) : 0,
      topDaireler: dr.recordset,
      gunTrend:    tr.recordset,
    };
  }
  const [s1, s2] = await Promise.all([ayStats(ay1), ayStats(ay2)]);
  return { ay1: s1, ay2: s2 };
}

// ─── Rapor: özel rapor oluştur ─────────────────────────────────────────────
async function getRaporOlustur({ ilce, mahalle, daire, durum, baslangic, bitis, sayfa = 1, limit = 100 }) {
  const p = await getPool();
  const conditions = [`YEAR(BASVURU_TA) BETWEEN 2018 AND 2030`];
  if (ilce)     conditions.push(`MAHALLE_AD_1 = '${ilce.replace(/'/g,"''")}'`);
  if (mahalle)  conditions.push(`MAHALLE_AD = '${mahalle.replace(/'/g,"''")}'`);
  if (daire)    conditions.push(`DAIRE_BASK_ADI = '${daire.replace(/'/g,"''")}'`);
  if (durum)    conditions.push(`BIRIM_ISLE = '${durum.replace(/'/g,"''")}'`);
  if (baslangic) conditions.push(`CAST(BASVURU_TA AS DATE) >= '${baslangic}'`);
  if (bitis)    conditions.push(`CAST(BASVURU_TA AS DATE) <= '${bitis}'`);

  const where = conditions.join(' AND ');
  const pg  = Math.max(1, +sayfa);
  const lm  = Math.min(500, Math.max(1, +limit));
  const off = (pg - 1) * lm;

  const countR = await p.request().query(`SELECT COUNT(*) AS toplam FROM view_Mahalle_Basvuru_AtananIs WHERE ${where}`);
  const toplam = countR.recordset[0]?.toplam || 0;

  const rows = await p.request().query(`
    SELECT MAHALLE_AD_1 AS ilce, MAHALLE_AD AS mahalle, KONUSU AS konu,
           ISNULL(DAIRE_BASK_ADI,'') AS daire, BIRIM_ISLE AS durum,
           CONVERT(VARCHAR(10), BASVURU_TA, 120) AS tarih,
           ISNULL(BIRIM_CEVA,'') AS cevap, CEVAP_SURE AS cevapSure
    FROM view_Mahalle_Basvuru_AtananIs
    WHERE ${where}
    ORDER BY BASVURU_TA DESC
    OFFSET ${off} ROWS FETCH NEXT ${lm} ROWS ONLY
  `);

  return { rows: rows.recordset, toplam, sayfa: pg, limit: lm };
}

// ─── Rapor: Excel export verisi ───────────────────────────────────────────
async function getRaporExportData({ ilce, mahalle, daire, durum, baslangic, bitis }) {
  return getRaporOlustur({ ilce, mahalle, daire, durum, baslangic, bitis, sayfa: 1, limit: 5000 });
}

// ─── PostgreSQL tabanlı fonksiyonlar ──────────────────────────────────────

function pgYilFilter(yil) {
  if (yil) {
    const y = +yil;
    return { gte: new Date(`${y}-01-01`), lt: new Date(`${y + 1}-01-01`) };
  }
  return { gte: new Date('2020-01-01'), lt: new Date('2028-01-01') };
}

function basvuruToMssqlRow(b) {
  return {
    OBJECTID:             b.id,
    BASVURU_OBJECTID:     b.muhtarbisId ? +b.muhtarbisId : b.id,
    BIRIM_IS_OBJECTID:    null,
    MAHALLE_AD:           b.mahalle,
    MAHALLE_AD_1:         b.ilce,
    MUHTAR_ADI:           b.muhtarAdi,
    BASVURU_TU:           b.basvuruTuru,
    BASVURU_TA:           b.tarih,
    KONUSU:               b.konu,
    TALEP_GENE:           b.aciklama,
    DAIRE_BASK_ADI:       b.daire,
    BIRIM_TALE:           null,
    BIRIM_ISLE:           b.durum,
    BIRIM_CEVA:           b.cevap,
    BIRIM_CE_2:           null,
    CEVAP_SURE:           null,
    BASVURU_created_date: b.tarih,
    kaynak:               b.kaynak,
  };
}

async function getStatsPG({ yil } = {}) {
  const tarihFilter = pgYilFilter(yil);
  const [agg, toplam] = await Promise.all([
    prisma.basvuru.groupBy({ by: ['durum'], where: { tarih: tarihFilter }, _count: { id: true } }),
    prisma.basvuru.count({ where: { tarih: tarihFilter } }),
  ]);
  const byDurum = {};
  for (const g of agg) byDurum[g.durum] = g._count.id;
  return {
    toplam,
    tamamlandi:   byDurum['Tamamlandı']    || 0,
    devam:        byDurum['Devam Etmekte'] || 0,
    tamamlanmadi: byDurum['Tamamlanmadı']  || 0,
    beklemede:    byDurum['Beklemede']     || 0,
    atanmamis:    0,
    ort_sure:     null,
  };
}

async function getDaireDagilimPG({ yil } = {}) {
  const tarihFilter = pgYilFilter(yil);
  const rows = await prisma.basvuru.groupBy({
    by: ['daire', 'durum'], where: { tarih: tarihFilter }, _count: { id: true },
  });
  const map = {};
  for (const r of rows) {
    const d = r.daire || 'Diğer / Tanımsız';
    if (!map[d]) map[d] = { daire: d, toplam: 0, tamamlandi: 0, devam: 0, tamamlanmadi: 0 };
    map[d].toplam += r._count.id;
    if (r.durum === 'Tamamlandı')    map[d].tamamlandi   += r._count.id;
    if (r.durum === 'Devam Etmekte') map[d].devam        += r._count.id;
    if (r.durum === 'Tamamlanmadı')  map[d].tamamlanmadi += r._count.id;
  }
  return Object.values(map).sort((a, b) => b.toplam - a.toplam);
}

async function getIlceDagilimPG({ yil } = {}) {
  const tarihFilter = pgYilFilter(yil);
  const rows = await prisma.basvuru.groupBy({
    by: ['ilce', 'durum'], where: { tarih: tarihFilter }, _count: { id: true },
  });
  const map = {};
  for (const r of rows) {
    const i = r.ilce || 'Bilinmiyor';
    if (!map[i]) map[i] = { ilce: i, toplam: 0, tamamlandi: 0, devam: 0 };
    map[i].toplam += r._count.id;
    if (r.durum === 'Tamamlandı')    map[i].tamamlandi += r._count.id;
    if (r.durum === 'Devam Etmekte') map[i].devam      += r._count.id;
  }
  return Object.values(map).sort((a, b) => b.toplam - a.toplam);
}

async function getListePG({ ilce, mahalle, daire, durum, tur, yil, q, sayfa = 1, limit = 50 } = {}) {
  const tarihFilter = pgYilFilter(yil);
  const where = {
    tarih: tarihFilter,
    ...(ilce    ? { ilce }    : {}),
    ...(mahalle ? { mahalle } : {}),
    ...(daire   ? { daire }   : {}),
    ...(durum   ? { durum }   : {}),
    ...(tur     ? { basvuruTuru: tur } : {}),
    ...(q ? { OR: [
      { konu:     { contains: q, mode: 'insensitive' } },
      { aciklama: { contains: q, mode: 'insensitive' } },
      { muhtarAdi: { contains: q, mode: 'insensitive' } },
    ]} : {}),
  };
  const pg  = Math.max(1, +sayfa);
  const lm  = +limit;
  const off = (pg - 1) * lm;
  const [total, rawRows] = await Promise.all([
    prisma.basvuru.count({ where }),
    prisma.basvuru.findMany({ where, orderBy: { tarih: 'desc' }, skip: off, take: lm }),
  ]);

  let rows = rawRows.map(basvuruToMssqlRow);

  // Son aktiviteyi her satıra ekle
  if (rows.length) {
    const ids = rawRows.map(r => r.id);
    const sonAkt = await prisma.$queryRaw`
      SELECT DISTINCT ON ("basvuruId")
        "basvuruId", icerik, tarih, tip, "yapanAd"
      FROM "BasvuruAktivite"
      WHERE "basvuruId" = ANY(${ids}::int[])
      ORDER BY "basvuruId", tarih DESC
    `;
    const aktMap = {};
    sonAkt.forEach(a => { aktMap[a.basvuruId] = a; });
    rows = rows.map(r => ({ ...r, sonAktivite: aktMap[r.id] || null }));
  }

  return { toplam: total, sayfa: pg, limit: lm, rows };
}

async function getFilterOptionsPG({ ilce } = {}) {
  const [ilceler, mahalleler, daireler] = await Promise.all([
    prisma.muhtar.findMany({ select: { ilce: true }, distinct: ['ilce'], orderBy: { ilce: 'asc' } }),
    ilce
      ? prisma.muhtar.findMany({ select: { mahalle: true }, where: { ilce }, orderBy: { mahalle: 'asc' } })
      : prisma.muhtar.findMany({ select: { mahalle: true }, distinct: ['mahalle'], orderBy: { mahalle: 'asc' } }),
    prisma.basvuru.findMany({ select: { daire: true }, distinct: ['daire'], where: { daire: { not: null } }, orderBy: { daire: 'asc' } }),
  ]);
  const yillarRaw = await prisma.$queryRaw`
    SELECT DISTINCT EXTRACT(YEAR FROM tarih)::int AS yil FROM "Basvuru"
    WHERE tarih IS NOT NULL ORDER BY yil DESC
  `;
  const yillar = yillarRaw.map(r => Number(r.yil)).filter(y => y >= 2020 && y <= 2028);
  return {
    ilceler:    ilceler.map(r => r.ilce),
    mahalleler: mahalleler.map(r => r.mahalle),
    daireler:   daireler.map(r => r.daire).filter(Boolean),
    yillar,
    durumlar:   ['Tamamlandı', 'Devam Etmekte', 'Tamamlanmadı', 'Beklemede'],
    turler:     ['İş Emri', 'Dilekçe'],
  };
}

async function getMahalleDetayPG({ ilce, mahalle }) {
  const [muhtar, istatistik] = await Promise.all([
    prisma.muhtar.findUnique({ where: { ilce_mahalle: { ilce, mahalle } } }),
    prisma.basvuru.groupBy({ by: ['durum'], where: { ilce, mahalle }, _count: { id: true } }),
  ]);
  const byDurum = {};
  let total = 0;
  for (const g of istatistik) { byDurum[g.durum] = g._count.id; total += g._count.id; }
  return {
    ilce,
    mahalle,
    muhtar:      muhtar?.muhtarAdi || null,
    muhtarBilgi: muhtar ? { ad: muhtar.muhtarAdi, nufus: muhtar.nufus, kirsal: null } : null,
    muhtarData:  muhtar || null,
    istatistik: {
      toplam:       total,
      tamamlandi:   byDurum['Tamamlandı']    || 0,
      devam:        byDurum['Devam Etmekte'] || 0,
      tamamlanmadi: byDurum['Tamamlanmadı']  || 0,
      beklemede:    byDurum['Beklemede']     || 0,
      ort_sure:     null,
    },
  };
}

async function getMahalleBasvurularPG({ ilce, mahalle, durum, sayfa = 1, limit = 50 } = {}) {
  const where = { ilce, mahalle, ...(durum ? { durum } : {}) };
  const pg  = Math.max(1, +sayfa);
  const lm  = +limit;
  const off = (pg - 1) * lm;
  const [total, rows] = await Promise.all([
    prisma.basvuru.count({ where }),
    prisma.basvuru.findMany({ where, orderBy: { tarih: 'desc' }, skip: off, take: lm }),
  ]);
  return { toplam: total, sayfa: pg, limit: lm, rows: rows.map(basvuruToMssqlRow) };
}

// ─── Aktivite yardımcı ──────────────────────────────────────────────────────
async function aktiviteEkle({ basvuruId, tip, icerik, eskiDeger, yeniDeger, yapan, yapanAd }) {
  return prisma.basvuruAktivite.create({
    data: { basvuruId, tip, icerik, eskiDeger: eskiDeger ?? null, yeniDeger: yeniDeger ?? null, yapan, yapanAd: yapanAd || null },
  });
}

async function getAktiviteler(basvuruId) {
  return prisma.basvuruAktivite.findMany({
    where:   { basvuruId: +basvuruId },
    orderBy: { tarih: 'desc' },
  });
}

async function createBasvuruPG({ ilce, mahalle, konu, aciklama, daire, tur, tarih, ekDosyaUrl, koordinasyonDaireleri, user }) {
  const muhtar = await prisma.muhtar.findUnique({
    where: { ilce_mahalle: { ilce, mahalle } }, select: { muhtarAdi: true },
  });
  const yeni = await prisma.basvuru.create({
    data: {
      ilce, mahalle,
      muhtarAdi:            muhtar?.muhtarAdi || null,
      konu:                 konu || 'Belirtilmemiş',
      aciklama:             aciklama || null,
      daire:                daire || null,
      basvuruTuru:          tur || null,
      tarih:                tarih ? new Date(tarih) : new Date(),
      durum:                'Beklemede',
      ekDosya:              ekDosyaUrl || null,
      koordinasyonDaireleri: Array.isArray(koordinasyonDaireleri)
        ? koordinasyonDaireleri.join(',') : koordinasyonDaireleri || null,
      giren:   String(user?.id || user?.username || 'sistem'),
      girenAd: user?.displayName || user?.username || null,
      kaynak:  'portal',
    },
  });
  await aktiviteEkle({
    basvuruId: yeni.id, tip: 'sistem', icerik: 'Başvuru oluşturuldu',
    yapan: String(user?.username || 'sistem'), yapanAd: user?.displayName || user?.username || 'Sistem',
  });
  return { success: true, id: yeni.id };
}

async function updateBasvuruPG({ objectId, fields, user }) {
  let basvuru = await prisma.basvuru.findFirst({ where: { muhtarbisId: String(objectId) } });
  if (!basvuru) {
    try { basvuru = await prisma.basvuru.findUnique({ where: { id: +objectId } }); } catch (_) {}
  }
  if (!basvuru) throw new Error('Başvuru bulunamadı');

  const allowed = ['durum', 'cevap', 'daire', 'konu', 'aciklama', 'resmiYaziNo', 'ilce', 'mahalle', 'muhtarAdi', 'basvuruTuru', 'koordinasyonDaireleri'];
  const data = {};
  for (const f of allowed) { if (fields[f] !== undefined) data[f] = fields[f]; }
  data.guncelleyen = user?.displayName || user?.username || null;

  const changes = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === 'guncelleyen') continue;
    if (basvuru[k] !== v) changes[k] = { eski: basvuru[k], yeni: v };
  }

  await prisma.basvuru.update({ where: { id: basvuru.id }, data });

  const yapan   = String(user?.username || 'sistem');
  const yapanAd = user?.displayName || user?.username || 'Sistem';

  if (Object.keys(changes).length) {
    // MuhtarbisEditLog — mevcut log tablosu
    await prisma.muhtarbisEditLog.createMany({
      data: Object.entries(changes).map(([alan, { eski, yeni }]) => ({
        objectId:     basvuru.id,
        alan,
        eskiDeger:    eski != null ? String(eski) : null,
        yeniDeger:    yeni != null ? String(yeni) : null,
        duzenleyenId: String(user?.id || user?.username || 'sistem'),
        duzenleyenAd: yapanAd,
      })),
    });

    // BasvuruAktivite — aktivite zaman çizelgesi
    const aktiviteler = [];
    if (changes.durum) {
      aktiviteler.push({ basvuruId: basvuru.id, tip: 'durum_degisim',
        icerik: `Durum: ${changes.durum.eski || '—'} → ${changes.durum.yeni}`,
        eskiDeger: changes.durum.eski != null ? String(changes.durum.eski) : null,
        yeniDeger: changes.durum.yeni != null ? String(changes.durum.yeni) : null,
        yapan, yapanAd });
    }
    if (changes.daire) {
      aktiviteler.push({ basvuruId: basvuru.id, tip: 'daire_atama',
        icerik: `Daire: ${changes.daire.eski || 'Belirtilmemiş'} → ${changes.daire.yeni || 'Belirtilmemiş'}`,
        eskiDeger: changes.daire.eski != null ? String(changes.daire.eski) : null,
        yeniDeger: changes.daire.yeni != null ? String(changes.daire.yeni) : null,
        yapan, yapanAd });
    }
    // Konu değişimi
    if (changes.konu) {
      aktiviteler.push({ basvuruId: basvuru.id, tip: 'sistem',
        icerik: `Konu: ${changes.konu.eski || '—'} → ${changes.konu.yeni}`,
        eskiDeger: changes.konu.eski != null ? String(changes.konu.eski) : null,
        yeniDeger: changes.konu.yeni != null ? String(changes.konu.yeni) : null,
        yapan, yapanAd });
    }
    // Cevap güncellemesi (mevcut cevap varsa da kaydet)
    if (changes.cevap && changes.cevap.yeni) {
      aktiviteler.push({ basvuruId: basvuru.id, tip: 'yorum',
        icerik: String(changes.cevap.yeni), eskiDeger: null, yeniDeger: null, yapan, yapanAd });
    }
    // Diğer alanlar
    const digerAlanlar = ['aciklama', 'resmiYaziNo', 'ilce', 'mahalle', 'muhtarAdi', 'basvuruTuru', 'koordinasyonDaireleri'];
    const degisen = digerAlanlar.filter(a => changes[a]);
    if (degisen.length) {
      aktiviteler.push({ basvuruId: basvuru.id, tip: 'sistem',
        icerik: `Güncellenen alanlar: ${degisen.join(', ')}`,
        eskiDeger: null, yeniDeger: null, yapan, yapanAd });
    }
    if (aktiviteler.length) {
      await prisma.basvuruAktivite.createMany({ data: aktiviteler });
    }
  }
  return { degisiklik: Object.keys(changes).length > 0, changes };
}

async function getMuhtarBilgi(ilce, mahalle) {
  return prisma.muhtar.findUnique({ where: { ilce_mahalle: { ilce, mahalle } } });
}

async function updateMuhtarBilgi(ilce, mahalle, data, user) {
  const allowed = ['muhtarAdi', 'gsm', 'nufus', 'muhtarOfisi', 'saglikOcagi', 'diniTesis', 'okul', 'hastane', 'sosyalTesis', 'cocukOyun', 'sporTesisi'];
  const update = {};
  for (const f of allowed) {
    if (data[f] !== undefined) update[f] = data[f] === '' ? null : data[f];
  }
  if (update.nufus != null) update.nufus = +update.nufus || null;
  update.guncelleyen = user?.displayName || user?.username || null;

  return prisma.muhtar.upsert({
    where: { ilce_mahalle: { ilce, mahalle } },
    create: { ilce, mahalle, muhtarAdi: data.muhtarAdi || '', ...update },
    update,
  });
}

async function getMuhtarlarPG({ ilce, sayfa = 1, limit = 50, q } = {}) {
  const where = {
    ...(ilce ? { ilce } : {}),
    ...(q ? { OR: [
      { mahalle:   { contains: q, mode: 'insensitive' } },
      { muhtarAdi: { contains: q, mode: 'insensitive' } },
    ]} : {}),
  };
  const pg  = Math.max(1, +sayfa);
  const lm  = Math.min(10000, Math.max(1, +limit));
  const off = (pg - 1) * lm;

  const [total, muhtarlar, basvuruStats] = await Promise.all([
    prisma.muhtar.count({ where }),
    prisma.muhtar.findMany({ where, orderBy: [{ ilce: 'asc' }, { mahalle: 'asc' }], skip: off, take: lm }),
    prisma.basvuru.groupBy({
      by: ['ilce', 'mahalle', 'durum'], _count: { id: true },
      where: ilce ? { ilce } : {},
    }),
  ]);

  const countMap = {};
  for (const s of basvuruStats) {
    const key = `${s.ilce}||${s.mahalle}`;
    if (!countMap[key]) countMap[key] = { toplamTalep: 0, tamamlanan: 0 };
    countMap[key].toplamTalep += s._count.id;
    if (s.durum === 'Tamamlandı') countMap[key].tamamlanan += s._count.id;
  }

  const rows = muhtarlar.map(r => {
    const stats = countMap[`${r.ilce}||${r.mahalle}`] || { toplamTalep: 0, tamamlanan: 0 };
    return {
      ilce:          r.ilce,
      mahalle:       r.mahalle,
      ad_soyad:      r.muhtarAdi || '—',
      nufus:         r.nufus || 0,
      gsm:           r.gsm || null,
      kirsal_merkez: null,
      toplamTalep:   stats.toplamTalep,
      tamamlanan:    stats.tamamlanan,
    };
  });
  return { rows, toplam: total, sayfa: pg, limit: lm };
}

async function getKonularPG() {
  const rows = await prisma.basvuru.findMany({
    select: { konu: true }, distinct: ['konu'],
    where: { konu: { not: null } }, orderBy: { konu: 'asc' },
  });
  return rows.map(r => r.konu).filter(k => k && k.length > 2);
}

// ─── Rapor PG fonksiyonları ──────────────────────────────────────────────

async function getRaporOzetPG() {
  const fs = require('fs');
  const tarihFilter = pgYilFilter();

  // Başvuru özeti
  const [total, byDurum] = await Promise.all([
    prisma.basvuru.count({ where: { tarih: tarihFilter } }),
    prisma.basvuru.groupBy({ by: ['durum'], where: { tarih: tarihFilter }, _count: { id: true } }),
  ]);
  const dm = {};
  for (const g of byDurum) dm[g.durum] = g._count.id;

  // Top 5 daire
  const daireRows = await prisma.basvuru.groupBy({
    by: ['daire'], where: { tarih: tarihFilter }, _count: { id: true },
    orderBy: { _count: { id: 'desc' } }, take: 5,
  });

  // İlçe dağılım
  const ilceRows = await prisma.basvuru.groupBy({
    by: ['ilce'], where: { tarih: tarihFilter }, _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  // Yatırım sayısı (JSON)
  let toplamYatirim = 0;
  try {
    const dataPath = path.join(__dirname, '../data/yatirimlar.json');
    const veri = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    for (const ilceData of Object.values(veri)) {
      for (const mahalleData of Object.values(ilceData)) {
        if (Array.isArray(mahalleData[3])) toplamYatirim += mahalleData[3].length;
      }
    }
  } catch (_) {}

  return {
    toplamBasvuru:  total,
    tamamlandi:     dm['Tamamlandı']    || 0,
    devamEtmekte:   dm['Devam Etmekte'] || 0,
    tamamlanmadi:   dm['Tamamlanmadı']  || 0,
    beklemede:      dm['Beklemede']      || 0,
    ortSure:        null,
    toplamYatirim,
    ilceDagilim:    ilceRows.map(r => ({ ilce: r.ilce || 'Bilinmiyor', toplam: r._count.id })),
    daireDagilim:   daireRows.map(r => ({ daire: r.daire || 'Diğer', toplam: r._count.id })),
    sonGuncelleme:  new Date().toISOString(),
  };
}

async function getRaporIlcePG(ilce) {
  const tarihFilter = pgYilFilter();
  const where = { tarih: tarihFilter, ilce };

  const [total, byDurum] = await Promise.all([
    prisma.basvuru.count({ where }),
    prisma.basvuru.groupBy({ by: ['durum'], where, _count: { id: true } }),
  ]);
  const dm = {};
  for (const g of byDurum) dm[g.durum] = g._count.id;

  // Mahalle dağılım
  const mahalleRows = await prisma.basvuru.groupBy({
    by: ['mahalle', 'durum'], where, _count: { id: true },
  });
  const mMap = {};
  for (const r of mahalleRows) {
    const m = r.mahalle || 'Bilinmiyor';
    if (!mMap[m]) mMap[m] = { mahalle: m, toplam: 0, tamamlandi: 0 };
    mMap[m].toplam += r._count.id;
    if (r.durum === 'Tamamlandı') mMap[m].tamamlandi += r._count.id;
  }

  // Top 5 daire
  const daireRows = await prisma.basvuru.groupBy({
    by: ['daire'], where, _count: { id: true },
    orderBy: { _count: { id: 'desc' } }, take: 5,
  });

  return {
    ilce,
    toplamBasvuru:   total,
    tamamlandi:      dm['Tamamlandı']    || 0,
    devamEtmekte:    dm['Devam Etmekte'] || 0,
    mahalleDagilim:  Object.values(mMap).sort((a, b) => b.toplam - a.toplam),
    topDaireler:     daireRows.map(r => ({ daire: r.daire || 'Diğer', toplam: r._count.id })),
  };
}

async function getKonuDagilimPG() {
  const tarihFilter = pgYilFilter();
  // Prisma groupBy doesn't support grouping by transformed fields, use raw query
  const rows = await prisma.$queryRaw`
    SELECT UPPER(TRIM(konu)) AS konu,
           COUNT(*)::int AS toplam,
           SUM(CASE WHEN durum = 'Tamamlandı' THEN 1 ELSE 0 END)::int AS tamamlandi
    FROM "Basvuru"
    WHERE konu IS NOT NULL AND LENGTH(TRIM(konu)) > 2
      AND tarih >= ${tarihFilter.gte} AND tarih < ${tarihFilter.lt}
    GROUP BY UPPER(TRIM(konu))
    ORDER BY toplam DESC
    LIMIT 15
  `;
  return rows;
}

async function getRaporDonemPG(tip) {
  const now = new Date();
  let tarihFilter;
  if (tip === 'hafta') {
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    tarihFilter = { gte: weekAgo };
  } else if (tip === 'yil') {
    tarihFilter = { gte: new Date(`${now.getFullYear()}-01-01`), lt: new Date(`${now.getFullYear() + 1}-01-01`) };
  } else if (tip === 'gunluk') {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    tarihFilter = { gte: dayStart, lt: dayEnd };
  } else {
    // ay (default)
    tarihFilter = { gte: new Date(now.getFullYear(), now.getMonth(), 1), lt: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }

  const byDurum = await prisma.basvuru.groupBy({
    by: ['durum'], where: { tarih: tarihFilter }, _count: { id: true },
  });
  const dm = {};
  let toplam = 0;
  for (const g of byDurum) { dm[g.durum] = g._count.id; toplam += g._count.id; }

  // Trend (group by date)
  let trend = [];
  if (tip !== 'gunluk') {
    const rows = await prisma.basvuru.findMany({
      where: { tarih: tarihFilter }, select: { tarih: true, durum: true },
    });
    const tMap = {};
    for (const r of rows) {
      let key;
      if (tip === 'yil') {
        key = r.tarih.getMonth() + 1; // ay numarası
      } else {
        key = tip === 'hafta' ? r.tarih.toISOString().slice(0, 10) : r.tarih.getDate();
      }
      if (!tMap[key]) tMap[key] = { toplam: 0, tamamlandi: 0 };
      tMap[key].toplam++;
      if (r.durum === 'Tamamlandı') tMap[key].tamamlandi++;
    }
    trend = Object.entries(tMap)
      .map(([k, v]) => ({ [tip === 'yil' ? 'ay' : 'gun']: tip === 'hafta' ? k : +k, ...v }))
      .sort((a, b) => {
        const ka = a.ay || a.gun; const kb = b.ay || b.gun;
        return String(ka).localeCompare(String(kb));
      });
  }

  return {
    toplam,
    tamamlandi:   dm['Tamamlandı']    || 0,
    devam:        dm['Devam Etmekte'] || 0,
    tamamlanmadi: dm['Tamamlanmadı']  || 0,
    trend,
  };
}

async function getRaporAylikKarsilastirmaPG(ay1, ay2) {
  async function ayStats(ayStr) {
    const [yil, ay] = ayStr.split('-').map(Number);
    const tarihFilter = { gte: new Date(yil, ay - 1, 1), lt: new Date(yil, ay, 1) };
    const byDurum = await prisma.basvuru.groupBy({
      by: ['durum'], where: { tarih: tarihFilter }, _count: { id: true },
    });
    const dm = {};
    let toplam = 0;
    for (const g of byDurum) { dm[g.durum] = g._count.id; toplam += g._count.id; }

    // Top 5 daire
    const daireRows = await prisma.basvuru.groupBy({
      by: ['daire'], where: { tarih: tarihFilter }, _count: { id: true },
      orderBy: { _count: { id: 'desc' } }, take: 5,
    });

    // Günlük trend
    const rows = await prisma.basvuru.findMany({
      where: { tarih: tarihFilter }, select: { tarih: true },
    });
    const gunMap = {};
    for (const r of rows) {
      const gun = r.tarih.getDate();
      gunMap[gun] = (gunMap[gun] || 0) + 1;
    }
    const gunTrend = Object.entries(gunMap).map(([g, t]) => ({ gun: +g, toplam: t })).sort((a, b) => a.gun - b.gun);

    return {
      ay: ayStr, toplam,
      tamamlandi:   dm['Tamamlandı']    || 0,
      devam:        dm['Devam Etmekte'] || 0,
      tamamlanmadi: dm['Tamamlanmadı']  || 0,
      oran: toplam > 0 ? Math.round(((dm['Tamamlandı'] || 0) / toplam) * 100) : 0,
      topDaireler: daireRows.map(r => ({ daire: r.daire || 'Diğer', toplam: r._count.id })),
      gunTrend,
    };
  }
  const [s1, s2] = await Promise.all([ayStats(ay1), ayStats(ay2)]);
  return { ay1: s1, ay2: s2 };
}

async function getRaporOlusturPG({ ilce, mahalle, daire, durum, baslangic, bitis, sayfa = 1, limit = 100 }) {
  const where = { tarih: pgYilFilter() };
  if (ilce)      where.ilce    = ilce;
  if (mahalle)   where.mahalle = mahalle;
  if (daire)     where.daire   = daire;
  if (durum)     where.durum   = durum;
  if (baslangic || bitis) {
    where.tarih = {};
    if (baslangic) where.tarih.gte = new Date(baslangic);
    if (bitis)     where.tarih.lte = new Date(bitis + 'T23:59:59');
  }

  const pg  = Math.max(1, +sayfa);
  const lm  = Math.min(500, Math.max(1, +limit));
  const off = (pg - 1) * lm;

  const [toplam, rows] = await Promise.all([
    prisma.basvuru.count({ where }),
    prisma.basvuru.findMany({ where, orderBy: { tarih: 'desc' }, skip: off, take: lm }),
  ]);

  return {
    rows: rows.map(r => ({
      ilce:      r.ilce,
      mahalle:   r.mahalle,
      konu:      r.konu,
      daire:     r.daire || '',
      durum:     r.durum,
      tarih:     r.tarih ? r.tarih.toISOString().slice(0, 10) : '',
      cevap:     r.cevap || '',
      cevapSure: null,
    })),
    toplam, sayfa: pg, limit: lm,
  };
}

async function getRaporExportDataPG(params) {
  return getRaporOlusturPG({ ...params, sayfa: 1, limit: 5000 });
}

module.exports = {
  getStats, getDaireDagilim, getIlceDagilim,
  getListe, getFilterOptions,
  getMahalleDetay, getMahalleBasvurular, getMahalleYatirimlar,
  updateBasvuru, saveEditLog, getEditLog,
  updateYatirim, createBasvuru, createYatirim,
  getRaporOzet, getRaporIlce, getRaporYatirimOzet, getRaporDonem,
  getRaporAylikKarsilastirma, getRaporOlustur, getRaporExportData,
  getPool,
  // PostgreSQL tabanlı
  getStatsPG, getDaireDagilimPG, getIlceDagilimPG, getListePG,
  getFilterOptionsPG, getMahalleDetayPG, getMahalleBasvurularPG,
  createBasvuruPG, updateBasvuruPG,
  getMuhtarBilgi, updateMuhtarBilgi, getMuhtarlarPG, getKonularPG,
  getRaporOzetPG, getRaporIlcePG, getKonuDagilimPG, getRaporDonemPG,
  getRaporAylikKarsilastirmaPG, getRaporOlusturPG, getRaporExportDataPG,
  // Aktivite
  aktiviteEkle, getAktiviteler,
};
