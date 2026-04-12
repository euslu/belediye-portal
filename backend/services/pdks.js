'use strict';
/**
 * PDKS Veritabanı Servisi — MUGLADB (MSSQL)
 * Doğrudan PDKS veritabanına bağlanıp devam/izin/personel verisini çeker.
 */

const mssql = require('mssql');

const PDKS_CONFIG = {
  server:   '10.100.0.159',
  database: 'MUGLADB',
  user:     'ethem.usluoglu',
  password: '**PDKS2026**',
  options:  { trustServerCertificate: true, encrypt: false },
  connectionTimeout: 10000,
  requestTimeout:    30000,
  pool: { max: 5, min: 0, idleTimeoutMillis: 60000 },
};

// ─── Connection pool (singleton) ────────────────────────────────────────────
let _pool = null;

async function getPool() {
  if (_pool && _pool.connected) return _pool;
  _pool = await mssql.connect(PDKS_CONFIG);
  return _pool;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * directorate parametresini parse eder.
 * "ALT_BIRIM:1749,1750" → { type:'altBirim', ids:[1749,1750] }
 * "BİLGİ İŞLEM" → { type:'directorate', value:'BİLGİ İŞLEM' }
 * null → null
 */
function parseFilter(directorate) {
  if (!directorate) return null;
  if (directorate.startsWith('ALT_BIRIM:')) {
    const ids = directorate.replace('ALT_BIRIM:', '').split(',').map(Number).filter(Boolean);
    return ids.length ? { type: 'altBirim', ids } : null;
  }
  return { type: 'directorate', value: directorate };
}

/**
 * SQL WHERE koşulu ve input binding'leri üretir.
 * @param {string} tableAlias  tablo alias'ı ('' veya 'pt' gibi)
 * @param {object} filter  parseFilter() sonucu
 * @param {object} req  mssql request objesi
 * @param {string} inputName  çakışma önlemek için benzersiz parametre adı
 * @returns {string} SQL WHERE parçası (baştaki AND dahil)
 */
function applyFilter(tableAlias, filter, req, inputName = 'dir') {
  if (!filter) return '';
  const prefix = tableAlias ? `${tableAlias}.` : '';
  if (filter.type === 'altBirim') {
    // MSSQL parametrize IN desteği yok, güvenli ID listesi üret
    const ids = filter.ids.map(Number).filter(n => Number.isInteger(n));
    return ids.length ? ` AND ${prefix}ALT_BIRIM_ID IN (${ids.join(',')})` : '';
  }
  req.input(inputName, `%${filter.value}%`);
  return ` AND ${prefix}PBS_ISYERI LIKE @${inputName}`;
}

// ─── Bağlantı testi ─────────────────────────────────────────────────────────
async function testConnection() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME
  `);
  return { success: true, tableCount: result.recordset.length, tables: result.recordset.map(r => r.TABLE_NAME) };
}

// ─── Günlük devam durumu ────────────────────────────────────────────────────
/**
 * @param {string} date  YYYY-MM-DD (varsayılan: bugün)
 * @param {string} directorate  PBS_ISYERI filter (e.g. 'BİLGİ İŞLEM')
 * @returns Personel listesi: adSoyad, birim, giris, cikis, durum, izinTur
 */
async function getDailyAttendance(date, directorate) {
  const pool    = await getPool();
  const dateStr = date || today();
  const filter  = parseFilter(directorate);

  // 1) Aktif personel
  const pReq = pool.request();
  const filterSql = applyFilter('', filter, pReq);
  let personelSql = `
    SELECT ID, TCKIMLIKNO, ADISOYADI, PBS_ISYERI, PBS_GOREV, PERSONEL_TURU, BIRIMID, ALT_BIRIM_ID
    FROM PERSONEL_TANIM
    WHERE AKTIF = 'E' AND IPTAL = 0 AND KurumId = 1${filterSql}
  `;
  personelSql += ' ORDER BY ADISOYADI';
  const personelResult = await pReq.query(personelSql);
  const personeller    = personelResult.recordset;

  if (!personeller.length) return [];

  // 2) Bugünkü giriş-çıkış logları
  let logSql = `
    SELECT pl.ID_PERSONEL_TANIM,
           MIN(pl.SAAT) AS ilkGiris,
           MAX(pl.SAAT) AS sonCikis,
           COUNT(*)     AS logSayisi
    FROM PERSONEL_LOG pl
    WHERE CAST(pl.TARIH AS DATE) = @tarih AND pl.IPTAL = 0
    GROUP BY pl.ID_PERSONEL_TANIM
  `;
  const logResult = await pool.request().input('tarih', dateStr).query(logSql);
  const logMap    = new Map(logResult.recordset.map(r => [r.ID_PERSONEL_TANIM, r]));

  // 3) Bugünkü izinler
  const izinResult = await pool.request().input('tarih2', dateStr).query(`
    SELECT TCKIMLIKNO, IZIN_TURU
    FROM PERSONEL_IZIN
    WHERE @tarih2 BETWEEN CAST(BASLAMA_TARIHI AS DATE) AND CAST(BITIS_TARIHI AS DATE)
    AND IPTAL = 0
  `);
  const izinMap = new Map(izinResult.recordset.map(r => [r.TCKIMLIKNO?.trim(), r.IZIN_TURU?.trim()]));

  // 4) Merge
  return personeller.map((p) => {
    const log    = logMap.get(p.ID);
    const izin   = izinMap.get(p.TCKIMLIKNO?.trim());

    let durum = 'GELMEDI';
    let giris = null;
    let cikis = null;

    if (izin) {
      durum = 'IZINLI';
    } else if (log) {
      durum = 'GELDI';
      giris = log.ilkGiris?.substring(0, 5) || null;
      // Çıkış: sadece log sayısı > 1 ise (giriş+çıkış) veya saati giriş saatinden farklıysa
      if (log.logSayisi > 1 && log.sonCikis !== log.ilkGiris) {
        cikis = log.sonCikis?.substring(0, 5) || null;
      }
    }

    return {
      id:         p.ID,
      tcKimlikNo: p.TCKIMLIKNO,
      adSoyad:    p.ADISOYADI,
      birim:      p.PBS_ISYERI,
      gorev:      p.PBS_GOREV,
      personelTuru: p.PERSONEL_TURU,
      giris,
      cikis,
      izinTur: izin || null,
      durum,
    };
  });
}

// ─── Daire bazlı özet ──────────────────────────────────────────────────────
async function getDepartmentSummary(date) {
  const pool    = await getPool();
  const dateStr = date || today();

  const result = await pool.request().input('tarih', dateStr).query(`
    SELECT
      pt.PBS_ISYERI                      AS directorate,
      COUNT(*)                           AS toplam,
      SUM(CASE WHEN pl.ID_PERSONEL_TANIM IS NOT NULL AND iz.TCKIMLIKNO IS NULL THEN 1 ELSE 0 END) AS gelen,
      SUM(CASE WHEN iz.TCKIMLIKNO IS NOT NULL THEN 1 ELSE 0 END) AS izinli,
      SUM(CASE WHEN pl.ID_PERSONEL_TANIM IS NULL AND iz.TCKIMLIKNO IS NULL THEN 1 ELSE 0 END) AS gelmedi
    FROM PERSONEL_TANIM pt
    LEFT JOIN (
      SELECT DISTINCT ID_PERSONEL_TANIM
      FROM PERSONEL_LOG
      WHERE CAST(TARIH AS DATE) = @tarih AND IPTAL = 0
    ) pl ON pl.ID_PERSONEL_TANIM = pt.ID
    LEFT JOIN (
      SELECT DISTINCT TCKIMLIKNO
      FROM PERSONEL_IZIN
      WHERE @tarih BETWEEN CAST(BASLAMA_TARIHI AS DATE) AND CAST(BITIS_TARIHI AS DATE)
      AND IPTAL = 0
    ) iz ON iz.TCKIMLIKNO = pt.TCKIMLIKNO
    WHERE pt.AKTIF = 'E' AND pt.IPTAL = 0 AND pt.KurumId = 1
    GROUP BY pt.PBS_ISYERI
    ORDER BY pt.PBS_ISYERI
  `);

  return result.recordset;
}

// ─── Genel özet (dashboard kartı) ──────────────────────────────────────────
async function getOverview(date, directorate) {
  const pool    = await getPool();
  const dateStr = date || today();
  const filter  = parseFilter(directorate);

  // Her subquery kendi request'ini kullanmalı (MSSQL parametre paylaşımı sıkıntılı olabiliyor)
  // Toplam personel
  const topReq = pool.request();
  const topFilter = applyFilter('', filter, topReq, 'dir1');
  const topResult = await topReq.query(
    `SELECT COUNT(*) AS cnt FROM PERSONEL_TANIM WHERE AKTIF='E' AND IPTAL=0 AND KurumId=1${topFilter}`
  );
  const toplamPersonel = topResult.recordset[0].cnt;

  // Bugün gelen
  const gelenReq = pool.request().input('tarih1', dateStr);
  const gelenFilter = applyFilter('pt', filter, gelenReq, 'dir2');
  const gelenResult = await gelenReq.query(`
    SELECT COUNT(DISTINCT pl.ID_PERSONEL_TANIM) AS cnt FROM PERSONEL_LOG pl
    JOIN PERSONEL_TANIM pt ON pt.ID = pl.ID_PERSONEL_TANIM
    WHERE CAST(pl.TARIH AS DATE)=@tarih1 AND pl.IPTAL=0
    AND pt.AKTIF='E' AND pt.IPTAL=0 AND pt.KurumId=1${gelenFilter}
  `);
  const bugunGelen = gelenResult.recordset[0].cnt;

  // Bugün izinli
  const izinReq = pool.request().input('tarih2', dateStr);
  const izinFilter = applyFilter('pt', filter, izinReq, 'dir3');
  const izinResult = await izinReq.query(`
    SELECT COUNT(*) AS cnt FROM PERSONEL_IZIN pi
    JOIN PERSONEL_TANIM pt ON pt.TCKIMLIKNO = pi.TCKIMLIKNO
    WHERE @tarih2 BETWEEN CAST(pi.BASLAMA_TARIHI AS DATE) AND CAST(pi.BITIS_TARIHI AS DATE)
    AND pi.IPTAL=0 AND pt.AKTIF='E' AND pt.IPTAL=0 AND pt.KurumId=1${izinFilter}
  `);
  const bugunIzinli = izinResult.recordset[0].cnt;

  const result = { recordset: [{ toplamPersonel, bugunGelen, bugunIzinli }] };

  // Daire listesi (admin dropdown için)
  const daireResult = await pool.request().query(`
    SELECT DISTINCT PBS_ISYERI FROM PERSONEL_TANIM
    WHERE AKTIF='E' AND IPTAL=0 AND KurumId=1 AND PBS_ISYERI IS NOT NULL
    ORDER BY PBS_ISYERI
  `);

  const r = result.recordset[0];
  return {
    toplamPersonel: r.toplamPersonel,
    gelen:          r.bugunGelen,
    izinli:         r.bugunIzinli,
    gelmedi:        r.toplamPersonel - r.bugunGelen - r.bugunIzinli,
    _daireler:      daireResult.recordset.map(d => d.PBS_ISYERI),
  };
}

// ─── İzin listesi ──────────────────────────────────────────────────────────
async function getLeaveList(date, directorate) {
  const pool    = await getPool();
  const dateStr = date || today();
  const filter  = parseFilter(directorate);

  const req = pool.request().input('tarih', dateStr);
  const filterSql = applyFilter('pt', filter, req);

  let sql = `
    SELECT pi.ADISOYADI, pi.TCKIMLIKNO, pi.IZIN_TURU, pi.PERSONEL_TURU,
           pi.BASLAMA_TARIHI, pi.BITIS_TARIHI,
           pt.PBS_ISYERI
    FROM PERSONEL_IZIN pi
    LEFT JOIN PERSONEL_TANIM pt ON pt.TCKIMLIKNO = pi.TCKIMLIKNO AND pt.AKTIF='E' AND pt.IPTAL=0
    WHERE @tarih BETWEEN CAST(pi.BASLAMA_TARIHI AS DATE) AND CAST(pi.BITIS_TARIHI AS DATE)
    AND pi.IPTAL = 0${filterSql}
  `;
  sql += ' ORDER BY pi.ADISOYADI';

  const result = await req.query(sql);
  return result.recordset.map(r => ({
    adSoyad:       r.ADISOYADI,
    tcKimlikNo:    r.TCKIMLIKNO,
    izinTur:       r.IZIN_TURU?.trim(),
    personelTuru:  r.PERSONEL_TURU,
    baslamaTarihi: r.BASLAMA_TARIHI,
    bitisTarihi:   r.BITIS_TARIHI,
    birim:         r.PBS_ISYERI,
  }));
}

// ─── Geç kalanlar ──────────────────────────────────────────────────────────
async function getLateArrivals(date, directorate, limitSaat = '08:35') {
  const pool    = await getPool();
  const dateStr = date || today();
  const filter  = parseFilter(directorate);

  const req = pool.request().input('tarih', dateStr);
  const filterSql = applyFilter('pt', filter, req);

  let sql = `
    SELECT pt.ADISOYADI, pt.PBS_ISYERI, pt.PBS_GOREV,
           MIN(pl.SAAT) AS ilkGiris
    FROM PERSONEL_LOG pl
    JOIN PERSONEL_TANIM pt ON pt.ID = pl.ID_PERSONEL_TANIM
    WHERE CAST(pl.TARIH AS DATE) = @tarih AND pl.IPTAL = 0
    AND pt.AKTIF = 'E' AND pt.IPTAL = 0 AND pt.KurumId = 1${filterSql}
  `;
  sql += `
    GROUP BY pt.ADISOYADI, pt.PBS_ISYERI, pt.PBS_GOREV
    HAVING MIN(pl.SAAT) > @limit
    ORDER BY MIN(pl.SAAT) DESC
  `;
  req.input('limit', limitSaat);

  const result = await req.query(sql);
  return result.recordset.map(r => ({
    adSoyad:  r.ADISOYADI,
    birim:    r.PBS_ISYERI,
    gorev:    r.PBS_GOREV,
    ilkGiris: r.ilkGiris?.substring(0, 5),
  }));
}

// ─── Trend verisi (periyodik) ──────────────────────────────────────────────
/**
 * @param {string} period  gunluk|haftalik|aylik|yillik
 * @param {string} directorate  PBS_ISYERI filter
 * @returns Array of { tarih, label, toplam, gelen, izinli, gelmedi }
 */
async function getTrend(period = 'haftalik', directorate) {
  const pool = await getPool();
  const bugun = new Date();
  const filter = parseFilter(directorate);
  const hasFilter = !!filter;

  // Tarih aralığını belirle
  let gunSayisi;
  if (period === 'raw')           gunSayisi = 90;
  else if (period === 'gunluk')   gunSayisi = 14;
  else if (period === 'haftalik') gunSayisi = 56;
  else if (period === 'aylik')    gunSayisi = 365;
  else                            gunSayisi = 1095;

  const baslangic = new Date(bugun);
  baslangic.setDate(bugun.getDate() - gunSayisi);
  const basStr = `${baslangic.getFullYear()}-${String(baslangic.getMonth() + 1).padStart(2, '0')}-${String(baslangic.getDate()).padStart(2, '0')}`;
  const bitStr = today();

  // Toplam aktif personel
  const topReq = pool.request();
  const topFilter = applyFilter('', filter, topReq, 'dir1');
  const topResult = await topReq.query(
    `SELECT COUNT(*) as toplam FROM PERSONEL_TANIM WHERE AKTIF='E' AND IPTAL=0 AND KurumId=1${topFilter}`
  );
  const toplam = topResult.recordset[0].toplam;

  // Günlük gelen sayıları
  const gelenReq = pool.request().input('bas', basStr).input('bit', bitStr);
  const gelenFilter = applyFilter('pt', filter, gelenReq, 'dir2');
  const gelenResult = await gelenReq.query(`
    SELECT CAST(pl.TARIH AS DATE) AS tarih,
           COUNT(DISTINCT pl.ID_PERSONEL_TANIM) AS gelen
    FROM PERSONEL_LOG pl
    ${hasFilter ? 'JOIN PERSONEL_TANIM pt ON pt.ID = pl.ID_PERSONEL_TANIM' : ''}
    WHERE CAST(pl.TARIH AS DATE) BETWEEN @bas AND @bit
    AND pl.IPTAL = 0
    ${hasFilter ? `AND pt.AKTIF='E' AND pt.IPTAL=0 AND pt.KurumId=1${gelenFilter}` : ''}
    GROUP BY CAST(pl.TARIH AS DATE)
  `);
  const gelenMap = new Map(gelenResult.recordset.map(r => [
    new Date(r.tarih).toISOString().slice(0, 10), r.gelen
  ]));

  // Günlük izinli sayıları
  const izinReq = pool.request().input('bas2', basStr).input('bit2', bitStr);
  const izinFilter = applyFilter('pt', filter, izinReq, 'dir3');
  const izinResult = await izinReq.query(`
    SELECT d.tarih, COUNT(DISTINCT pi.TCKIMLIKNO) AS izinli
    FROM (
      SELECT DISTINCT CAST(pl.TARIH AS DATE) AS tarih
      FROM PERSONEL_LOG pl
      WHERE CAST(pl.TARIH AS DATE) BETWEEN @bas2 AND @bit2 AND pl.IPTAL = 0
    ) d
    JOIN PERSONEL_IZIN pi ON d.tarih BETWEEN CAST(pi.BASLAMA_TARIHI AS DATE) AND CAST(pi.BITIS_TARIHI AS DATE)
      AND pi.IPTAL = 0
    ${hasFilter ? `JOIN PERSONEL_TANIM pt ON pt.TCKIMLIKNO = pi.TCKIMLIKNO AND pt.AKTIF='E' AND pt.IPTAL=0 AND pt.KurumId=1${izinFilter}` : ''}
    GROUP BY d.tarih
  `);
  const izinMap = new Map(izinResult.recordset.map(r => [
    new Date(r.tarih).toISOString().slice(0, 10), r.izinli
  ]));

  // Tüm günleri birleştir
  const gunlukData = [];
  for (const [tarih, gelen] of gelenMap) {
    const izinli = izinMap.get(tarih) || 0;
    gunlukData.push({
      tarih,
      toplam,
      gelen,
      izinli,
      gelmedi: Math.max(0, toplam - gelen - izinli),
    });
  }
  gunlukData.sort((a, b) => a.tarih.localeCompare(b.tarih));

  // Periyoda göre gruplama
  if (period === 'raw') {
    // Ham günlük veri — frontend'de aggregate edilecek
    return gunlukData.filter(d => d.gelen > 0);
  }

  if (period === 'gunluk') {
    // Son 14 iş günü (gelen > 0 olan günler)
    const isGunleri = gunlukData.filter(d => d.gelen > 0);
    return isGunleri.slice(-14).map(d => ({
      ...d,
      label: new Date(d.tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
    }));
  }

  if (period === 'haftalik') {
    // Haftalık ortalama
    const haftalik = new Map();
    for (const d of gunlukData) {
      if (d.gelen === 0) continue; // hafta sonu
      const dt = new Date(d.tarih);
      // Haftanın başlangıcı (Pazartesi)
      const day = dt.getDay() || 7;
      const mon = new Date(dt);
      mon.setDate(dt.getDate() - day + 1);
      const key = mon.toISOString().slice(0, 10);
      if (!haftalik.has(key)) haftalik.set(key, { gelen: 0, izinli: 0, gelmedi: 0, gun: 0 });
      const h = haftalik.get(key);
      h.gelen += d.gelen; h.izinli += d.izinli; h.gelmedi += d.gelmedi; h.gun++;
    }
    const result = [];
    for (const [key, h] of haftalik) {
      if (h.gun === 0) continue;
      result.push({
        tarih: key,
        label: new Date(key).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) + ' hft',
        toplam,
        gelen: Math.round(h.gelen / h.gun),
        izinli: Math.round(h.izinli / h.gun),
        gelmedi: Math.round(h.gelmedi / h.gun),
      });
    }
    return result.slice(-8);
  }

  if (period === 'aylik') {
    const aylik = new Map();
    for (const d of gunlukData) {
      if (d.gelen === 0) continue;
      const key = d.tarih.slice(0, 7); // YYYY-MM
      if (!aylik.has(key)) aylik.set(key, { gelen: 0, izinli: 0, gelmedi: 0, gun: 0 });
      const m = aylik.get(key);
      m.gelen += d.gelen; m.izinli += d.izinli; m.gelmedi += d.gelmedi; m.gun++;
    }
    const result = [];
    const ayAdlari = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    for (const [key, m] of aylik) {
      if (m.gun === 0) continue;
      const [y, mo] = key.split('-');
      result.push({
        tarih: key + '-01',
        label: ayAdlari[parseInt(mo) - 1] + ' ' + y.slice(2),
        toplam,
        gelen: Math.round(m.gelen / m.gun),
        izinli: Math.round(m.izinli / m.gun),
        gelmedi: Math.round(m.gelmedi / m.gun),
      });
    }
    return result.slice(-12);
  }

  // yillik
  const yillik = new Map();
  for (const d of gunlukData) {
    if (d.gelen === 0) continue;
    const key = d.tarih.slice(0, 4);
    if (!yillik.has(key)) yillik.set(key, { gelen: 0, izinli: 0, gelmedi: 0, gun: 0 });
    const y = yillik.get(key);
    y.gelen += d.gelen; y.izinli += d.izinli; y.gelmedi += d.gelmedi; y.gun++;
  }
  const result = [];
  for (const [key, y] of yillik) {
    if (y.gun === 0) continue;
    result.push({
      tarih: key + '-01-01',
      label: key,
      toplam,
      gelen: Math.round(y.gelen / y.gun),
      izinli: Math.round(y.izinli / y.gun),
      gelmedi: Math.round(y.gelmedi / y.gun),
    });
  }
  return result.slice(-3);
}

/**
 * Müdür için PDKS filtresi oluşturur.
 * displayName ile PDKS'te kişiyi bulur, ALT_BIRIM_ID + altındaki birimleri döner.
 * @returns {{ pbsIsyeri: string, altBirimIds: number[] } | null}
 */
async function findMudurFilter(displayName) {
  if (!displayName) return null;
  try {
    const pool = await getPool();
    const parts = displayName.trim().split(/\s+/).filter(p => p.length > 1);
    if (!parts.length) return null;
    const conditions = parts.map((_, i) => `ADISOYADI LIKE @p${i}`).join(' AND ');
    const req = pool.request();
    parts.forEach((p, i) => req.input(`p${i}`, `%${p}%`));
    const r = await req.query(
      `SELECT TOP 1 PBS_ISYERI, ALT_BIRIM_ID, BIRIMID FROM PERSONEL_TANIM
       WHERE ${conditions} AND AKTIF='E' AND IPTAL=0 AND KurumId=1`
    );
    if (!r.recordset.length) return null;
    const row = r.recordset[0];
    const mudurAltBirimId = row.ALT_BIRIM_ID;

    // Müdürün altındaki ALT_BIRIM_ID'leri bul:
    // Aynı PBS_ISYERI'deki tüm kişilerden, müdür ile aynı veya müdür+1 ID'ye sahip olanlar
    // Daha güvenilir: PBS_ISYERI içindeki tüm personeli çek, müdürün kendisi + diğer ALT_BIRIM_ID'leri karşılaştır
    const allReq = pool.request()
      .input('isyeri', row.PBS_ISYERI)
      .input('mudurAbid', mudurAltBirimId);
    const allResult = await allReq.query(`
      SELECT DISTINCT ALT_BIRIM_ID, COUNT(*) as cnt
      FROM PERSONEL_TANIM
      WHERE PBS_ISYERI = @isyeri AND AKTIF='E' AND IPTAL=0 AND KurumId=1
      GROUP BY ALT_BIRIM_ID
    `);

    // Müdürün kendi ALT_BIRIM_ID'si ve hemen bir üst/alt olan birimleri al
    // Strateji: ALT_BIRIMLER tablosundan hiyerarşiyle veya yakın ID'ler ile
    // Pratik: müdürün ALT_BIRIM_ID'sinde sadece kendisi varsa (cnt=1), bir sonraki ID personeli olabilir
    const mudurGroup = allResult.recordset.find(r => r.ALT_BIRIM_ID === mudurAltBirimId);
    const altBirimIds = [mudurAltBirimId];

    if (mudurGroup && mudurGroup.cnt <= 2) {
      // Müdür tek kişi — altındaki birimi bul (genellikle müdür_id + 1)
      const candidates = allResult.recordset
        .filter(r => r.ALT_BIRIM_ID !== mudurAltBirimId && r.cnt > 1)
        .sort((a, b) => Math.abs(a.ALT_BIRIM_ID - mudurAltBirimId) - Math.abs(b.ALT_BIRIM_ID - mudurAltBirimId));
      // En yakın ID'yi al (genellikle +1)
      if (candidates.length) {
        const closest = candidates[0];
        if (Math.abs(closest.ALT_BIRIM_ID - mudurAltBirimId) <= 5) {
          altBirimIds.push(closest.ALT_BIRIM_ID);
        }
      }
    }

    return { pbsIsyeri: row.PBS_ISYERI, altBirimIds };
  } catch (e) {
    console.error('[PDKS] findMudurFilter hata:', e.message);
    return null;
  }
}

module.exports = {
  testConnection,
  getDailyAttendance,
  getDepartmentSummary,
  getOverview,
  getLeaveList,
  getLateArrivals,
  getTrend,
  findMudurFilter,
};
