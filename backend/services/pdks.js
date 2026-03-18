'use strict';
/**
 * PDKS Veritabanı Servisi
 * MSSQL / MySQL / PostgreSQL desteği
 * Bağlantı bilgileri SystemSetting tablosundan alınır.
 */

const prisma = require('../lib/prisma');

// ─── Bağlantı ayarlarını DB'den çek ──────────────────────────────────────────
async function getPdksConfig() {
  const rows = await prisma.systemSetting.findMany({ where: { category: 'PDKS' } });
  const cfg  = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    enabled:  cfg.pdks_enabled === 'true',
    type:     'mssql',
    host:     cfg.pdks_host     || '',
    port:     parseInt(cfg.pdks_port) || 1433,
    instance: cfg.pdks_instance || '',
    database: cfg.pdks_db       || '',
    user:     cfg.pdks_user     || '',
    password: cfg.pdks_password || '',
  };
}

// ─── MSSQL bağlantısı ────────────────────────────────────────────────────────
async function mssqlQuery(cfg, sql, params = []) {
  const mssql = require('mssql');
  const connCfg = {
    server:   cfg.host,
    database: cfg.database,
    user:     cfg.user,
    password: cfg.password,
    options: {
      trustServerCertificate: true,
      enableArithAbort: true,
      encrypt: false,
      ...(cfg.instance ? { instanceName: cfg.instance } : {}),
    },
    connectionTimeout: 10000,
    requestTimeout:    15000,
  };
  if (!cfg.instance) connCfg.port = cfg.port;
  const pool  = await mssql.connect(connCfg);
  try {
    const req = pool.request();
    params.forEach((p, i) => req.input(`p${i}`, p));
    const result = await req.query(sql);
    return result.recordset;
  } finally {
    await pool.close();
  }
}

// ─── MySQL bağlantısı ─────────────────────────────────────────────────────────
async function mysqlQuery(cfg, sql, params = []) {
  const mysql = require('mysql2/promise');
  const conn  = await mysql.createConnection({
    host:     cfg.host,
    port:     cfg.port,
    database: cfg.database,
    user:     cfg.user,
    password: cfg.password,
    connectTimeout: 10000,
  });
  try {
    const [rows] = await conn.execute(sql, params);
    return rows;
  } finally {
    await conn.end();
  }
}

// ─── PostgreSQL bağlantısı ────────────────────────────────────────────────────
async function pgQuery(cfg, sql, params = []) {
  const { Client } = require('pg');
  const client = new Client({
    host:     cfg.host,
    port:     cfg.port,
    database: cfg.database,
    user:     cfg.user,
    password: cfg.password,
    connectionTimeoutMillis: 10000,
  });
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    await client.end();
  }
}

// ─── Genel sorgu yönlendirici ─────────────────────────────────────────────────
async function query(cfg, sql, params = []) {
  switch (cfg.type) {
    case 'mysql':    return mysqlQuery(cfg, sql, params);
    case 'postgres': return pgQuery(cfg, sql, params);
    default:         return mssqlQuery(cfg, sql, params);
  }
}

// ─── Placeholder uyumu (MSSQL @p0, MySQL/PG $1/??) ───────────────────────────
function buildSql(template, cfg) {
  if (cfg.type === 'mssql') {
    // @date → @p0 şeklinde, parametre adı korunur
    return template;
  }
  if (cfg.type === 'postgres') {
    let i = 1;
    return template.replace(/@\w+/g, () => `$${i++}`);
  }
  // mysql
  return template.replace(/@\w+/g, '?');
}

// ─── Bağlantı testi + tablo listesi ──────────────────────────────────────────
async function testConnection(overrideCfg = null) {
  const cfg = overrideCfg || await getPdksConfig();
  if (!cfg.host) throw new Error('Host tanımlanmamış');

  const tablesSql = `
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `;
  const rows   = await query(cfg, tablesSql);
  const tables = rows.map(r => r.TABLE_NAME || r.table_name);
  return { success: true, tableCount: tables.length, tables };
}

// ─── Tablo yapısı keşfi ───────────────────────────────────────────────────────
async function exploreTable(tableName, overrideCfg = null) {
  const cfg = overrideCfg || await getPdksConfig();
  if (!cfg.host) throw new Error('Host tanımlanmamış');

  const colsSql = `
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '${tableName.replace(/'/g, "''")}'
    ORDER BY ORDINAL_POSITION
  `;
  const sampleSql = `SELECT TOP 5 * FROM [${tableName.replace(/]/g, ']]')}]`;

  const [columns, sample] = await Promise.all([
    query(cfg, colsSql),
    query(cfg, sampleSql).catch(() => []),
  ]);

  return { tableName, columns, sample };
}

// ─── Günlük devam/devamsızlık ─────────────────────────────────────────────────
/**
 * Her PDKS sisteminin şeması farklıdır.
 * Aşağıdaki sorgu Uyumsoft / Paloma tarzı şemayı hedefler.
 * Gerçek tablolar farklıysa bu sorguyu sisteme göre uyarlamanız gerekir.
 *
 * Beklenen sütunlar: SicilNo, AdSoyad, Birim, Sube, GirisSaati, CikisSaati, Durum
 * Durum: GELDI | GELMEDI | IZINLI | RESMI_TATIL | GOREVLENDIRME
 */
async function getDailyAttendance(date, directorate = null) {
  const cfg = await getPdksConfig();
  if (!cfg.enabled || !cfg.host) return null;

  const dateStr = date || new Date().toISOString().slice(0, 10);

  // MSSQL örnek sorgusu — sisteminize göre düzenleyin
  const sql = buildSql(`
    SELECT
      p.SicilNo        AS sicilNo,
      p.AdSoyad        AS adSoyad,
      p.Birim          AS birim,
      p.Sube           AS sube,
      g.GirisSaati     AS girisSaati,
      g.CikisSaati     AS cikisSaati,
      CASE
        WHEN g.SicilNo IS NULL THEN 'GELMEDI'
        WHEN g.IzinTur IS NOT NULL THEN 'IZINLI'
        ELSE 'GELDI'
      END              AS durum,
      g.IzinTur        AS izinTur
    FROM Personel p
    LEFT JOIN GunlukDevam g ON p.SicilNo = g.SicilNo
      AND CAST(g.Tarih AS DATE) = @date
    WHERE p.Aktif = 1
    ${directorate ? 'AND p.Birim = @directorate' : ''}
    ORDER BY p.Birim, p.Sube, p.AdSoyad
  `, cfg);

  const params = directorate ? [dateStr, directorate] : [dateStr];
  return query(cfg, sql, params);
}

// ─── Daire bazlı özet ─────────────────────────────────────────────────────────
async function getDepartmentSummary(date) {
  const cfg = await getPdksConfig();
  if (!cfg.enabled || !cfg.host) return null;

  const dateStr = date || new Date().toISOString().slice(0, 10);

  const sql = buildSql(`
    SELECT
      p.Birim                                   AS directorate,
      COUNT(*)                                  AS toplam,
      SUM(CASE WHEN g.SicilNo IS NOT NULL AND g.IzinTur IS NULL THEN 1 ELSE 0 END) AS gelen,
      SUM(CASE WHEN g.SicilNo IS NULL THEN 1 ELSE 0 END)                            AS gelmedi,
      SUM(CASE WHEN g.IzinTur IS NOT NULL THEN 1 ELSE 0 END)                        AS izinli
    FROM Personel p
    LEFT JOIN GunlukDevam g ON p.SicilNo = g.SicilNo
      AND CAST(g.Tarih AS DATE) = @date
    WHERE p.Aktif = 1
    GROUP BY p.Birim
    ORDER BY p.Birim
  `, cfg);

  return query(cfg, sql, [dateStr]);
}

// ─── İzin listesi ─────────────────────────────────────────────────────────────
async function getLeaveInfo(date) {
  const cfg = await getPdksConfig();
  if (!cfg.enabled || !cfg.host) return null;

  const dateStr = date || new Date().toISOString().slice(0, 10);

  const sql = buildSql(`
    SELECT
      p.SicilNo    AS sicilNo,
      p.AdSoyad    AS adSoyad,
      p.Birim      AS birim,
      g.IzinTur    AS izinTur,
      g.IzinSuresi AS izinSuresi
    FROM Personel p
    INNER JOIN GunlukDevam g ON p.SicilNo = g.SicilNo
      AND CAST(g.Tarih AS DATE) = @date
    WHERE g.IzinTur IS NOT NULL AND p.Aktif = 1
    ORDER BY p.Birim, p.AdSoyad
  `, cfg);

  return query(cfg, sql, [dateStr]);
}

module.exports = { testConnection, exploreTable, getDailyAttendance, getDepartmentSummary, getLeaveInfo, getPdksConfig };
