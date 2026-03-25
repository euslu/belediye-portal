const sql = require('mssql');

let _pool = null;

function getConfig() {
  return {
    server: process.env.MUHTARBIS_HOST || '10.5.2.69',
    port:   +(process.env.MUHTARBIS_PORT || 3322),
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
  OBJECTID, BASVURU_OBJECTID,
  MAHALLE_AD, MAHALLE_AD_1,
  MUHTAR_ADI,
  BASVURU_TU, BASVURU_TA,
  KONUSU, TALEP_GENE,
  DAIRE_BASK_ADI,
  BIRIM_TALE, BIRIM_ISLE, BIRIM_CEVA, BIRIM_CE_2,
  CEVAP_SURE,
  BASVURU_created_date
`;

async function getListe({ ilce, daire, durum, tur, yil, q, sayfa = 1, limit = 50 } = {}) {
  const p  = await getPool();
  const offset = (Math.max(1, +sayfa) - 1) * +limit;

  const conds = ['YEAR(BASVURU_TA) BETWEEN 2020 AND 2027'];
  const params = {};

  if (ilce)  { conds.push("MAHALLE_AD_1   = @ilce");  params.ilce  = { type: sql.NVarChar, val: ilce  }; }
  if (daire) { conds.push("DAIRE_BASK_ADI = @daire"); params.daire = { type: sql.VarChar,  val: daire }; }
  if (durum) { conds.push("BIRIM_ISLE     = @durum"); params.durum = { type: sql.NVarChar, val: durum }; }
  if (tur)   { conds.push("BASVURU_TU     = @tur");   params.tur   = { type: sql.NVarChar, val: tur   }; }
  if (yil)   { conds.push("YEAR(BASVURU_TA) = @yil"); params.yil   = { type: sql.Int,      val: +yil  }; }
  if (q)     { conds.push("(KONUSU LIKE @q OR TALEP_GENE LIKE @q OR MUHTAR_ADI LIKE @q)"); params.q = { type: sql.NVarChar, val: `%${q}%` }; }

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
async function getFilterOptions() {
  const p = await getPool();
  const [ilceler, daireler, yillar] = await Promise.all([
    p.request().query("SELECT DISTINCT MAHALLE_AD_1 AS v FROM view_Mahalle_Basvuru_AtananIs WHERE MAHALLE_AD_1 IS NOT NULL ORDER BY MAHALLE_AD_1"),
    p.request().query("SELECT DISTINCT DAIRE_BASK_ADI AS v FROM view_Mahalle_Basvuru_AtananIs WHERE DAIRE_BASK_ADI IS NOT NULL ORDER BY DAIRE_BASK_ADI"),
    p.request().query("SELECT DISTINCT YEAR(BASVURU_TA) AS v FROM view_Mahalle_Basvuru_AtananIs WHERE YEAR(BASVURU_TA) BETWEEN 2020 AND 2027 ORDER BY v DESC"),
  ]);
  return {
    ilceler:  ilceler.recordset.map(r => r.v),
    daireler: daireler.recordset.map(r => r.v),
    yillar:   yillar.recordset.map(r => r.v),
    durumlar: ['Tamamlandı', 'Devam Etmekte', 'Tamamlanmadı', 'Beklemede'],
    turler:   ['İş Emri', 'Dilekçe'],
  };
}

module.exports = { getStats, getDaireDagilim, getIlceDagilim, getListe, getFilterOptions };
