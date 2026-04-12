const crypto  = require('crypto');
const https   = require('https');
const { getTlsOptions } = require('../utils/tls');

// ── PBS_PERSONEL config (mevcut) ─────────────────────────────────────────────
const PBS_CONFIG = {
  sisUrl: process.env.FLEXCITY_SIS_URL || 'https://ybs.mugla.bel.tr:8081/FlexCityUi/rest/json/sis/RestDataset',
  kbsUrl: process.env.FLEXCITY_KBS_URL || 'https://ybs.mugla.bel.tr:8081/FlexCityUi/rest/json/kbs/FindAllKbsOrgutDto',
  apiKey: process.env.FLEXCITY_API_KEY || 'njSVunfF3IrwRwQ0kK2eyMjHiswYWZSinNKPLQGLb1oqo2eJF4ujQ4UgzNqaQgp8NAwmW0RrhG83eklHMiIcq5cTLTJJjhguewKJAvS8HUkZBAYqZNbLmt2sgmboqC4Z',
  appKey: process.env.FLEXCITY_APP_KEY || 'PBS_PERSONEL',
};

// ── BASKAN config (yeni - BSK_ dataset'leri) ──────────────────────────────────
const BSK_URL     = 'https://ybs.mugla.bel.tr:8081/FlexCityUi/rest/json/sis/RestDataset';
const BSK_APP_KEY = 'BASKAN';
const BSK_SEC     = 'PWMDLIFeSmJstN8ajtdsrPDgqfXah6vvhNyOrWUVAWWuv3s3UJWqeZHPQeVN9ir8a3SnDfRTEshxzDEOJBXxTvm90rRvtnHzPGItXk85S9w7fV0olahstdImheIo7Idp';

// ── Auth helpers ───────────────────────────────────────────────────────────────
function makeAuthHeader(appKey, secCode) {
  const pad = n => String(n).padStart(2, '0');
  const now = new Date();
  const rd  = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T` +
              `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}+03:00`;
  const md5 = crypto.createHash('md5').update(secCode + rd, 'utf8').digest('hex');
  return `applicationkey=${appKey},md5hashcode=${md5},requestdate=${rd}`;
}

function getAuthHeader() {
  return makeAuthHeader(PBS_CONFIG.appKey, PBS_CONFIG.apiKey);
}

// ── HTTPS POST helper (plain-text body, self-signed OK) ───────────────────────
function httpsPost(rawUrl, body, authHeader) {
  return new Promise((resolve, reject) => {
    const u    = new URL(rawUrl);
    const opts = {
      hostname: u.hostname, port: u.port || 443, path: u.pathname,
      method: 'POST',
      ...getTlsOptions('FLEXCITY', rawUrl, ['ybs.mugla.bel.tr']),
      headers: {
        'Authorization':  authHeader,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error(`JSON parse: ${raw.slice(0, 80)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

// ── PBS (mevcut) ──────────────────────────────────────────────────────────────
async function fetchPersonel() {
  const r = await fetch(PBS_CONFIG.sisUrl, {
    method: 'POST',
    headers: { 'Authorization': getAuthHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'datasetName=ldap_pbs_personel',
  });
  if (!r.ok) throw new Error(`SIS HTTP ${r.status}`);
  const data = await r.json();
  return data.resultSet || data.data || data || [];
}

async function fetchOrgut() {
  const r = await fetch(PBS_CONFIG.kbsUrl, {
    method: 'POST',
    headers: { 'Authorization': getAuthHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'tumu=EVET',
  });
  if (!r.ok) throw new Error(`KBS HTTP ${r.status}`);
  const data = await r.json();
  return Array.isArray(data) ? data : (data.kbsOrgutDtoList || data.resultSet || data.data || []);
}

// ── BSK dataset cache ─────────────────────────────────────────────────────────
// BSK_PERSONEL_BILGI: 12 saat (büyük dataset, yavaş değişir)
// Diğer dataset'ler: 1 saat
const CACHE_TTL = {
  BSK_PERSONEL_BILGI: 12 * 60 * 60 * 1000,
  default:             60 * 60 * 1000,
};
const _cache = {};
async function getBskDataset(name) {
  const TTL = CACHE_TTL[name] || CACHE_TTL.default;
  if (_cache[name] && Date.now() - _cache[name].ts < TTL) return _cache[name].data;
  const auth = makeAuthHeader(BSK_APP_KEY, BSK_SEC);
  const res  = await httpsPost(BSK_URL, `datasetName=${name}`, auth);
  if (!res?.success) throw new Error(res?.resultMessage || 'FlexCity hata');
  _cache[name] = { data: res.resultSet || [], ts: Date.now() };
  return _cache[name].data;
}

// ── Yardımcı: gruplama ────────────────────────────────────────────────────────
function sayByKey(arr, key, topN = 15) {
  const map = {};
  for (const r of arr) {
    const v = r[key] || 'Bilinmiyor';
    map[v] = (map[v] || 0) + 1;
  }
  return Object.entries(map).sort((a, b) => b[1]-a[1]).slice(0, topN)
    .map(([ad, sayi]) => ({ ad, sayi }));
}

function sumByKey(arr, groupKey, sumKey, topN = 15) {
  const map = {};
  for (const r of arr) {
    const k = r[groupKey] || 'Bilinmiyor';
    map[k] = (map[k] || 0) + (Number(r[sumKey]) || 0);
  }
  return Object.entries(map).sort((a, b) => b[1]-a[1]).slice(0, topN)
    .map(([ad, sayi]) => ({ ad, sayi }));
}

// ── BSK İstatistik ────────────────────────────────────────────────────────────
async function getBskIstatistik() {
  const results = await Promise.allSettled([
    getBskDataset('BSK_MAHALLE_BILGI'),
    getBskDataset('BSK_PERSONEL_BILGI'),
    getBskDataset('BSK_SOSYAL_YARDIM'),
    getBskDataset('BSK_EVDE_BAKIM'),
    getBskDataset('BSK_HASTA_NAKIL'),
    getBskDataset('BSK_SEHIT_GAZI'),
    getBskDataset('BSK_TASINMAZ'),
    getBskDataset('BSK_TAHSIS'),
    getBskDataset('BSK_PERSONEL_DOGUM'),
    getBskDataset('BSK_PERSONEL_EVLENME'),
  ]);

  const ok = r => r.status === 'fulfilled' ? r.value : [];
  const [M, P, S, E, H, G, T, TH, D, EV] = results.map(ok);

  return {
    cachedAt: new Date().toISOString(),
    mahalle: {
      toplam:   M.length,
      ilceler:  sayByKey(M, 'ILCE', 20),
      partiler: sayByKey(M, 'PARTI', 10),
      nufus: {
        erkek: M.reduce((s, r) => s + (Number(r.ERKEK_NUFUS)||0), 0),
        kadin: M.reduce((s, r) => s + (Number(r.KADIN_NUFUS)||0), 0),
        hane:  M.reduce((s, r) => s + (Number(r.HANE_SAYISI)||0), 0),
      },
    },
    personel: {
      toplam:          P.length,
      erkek:           P.filter(r => r.CINSIYET === 'ERKEK').length,
      kadin:           P.filter(r => r.CINSIYET === 'KADIN').length,
      daireSayisi:     new Set(P.map(r => r.DAIRE).filter(Boolean)).size,
      mudurlukSayisi:  new Set(P.map(r => r.MUDURLUK).filter(Boolean)).size,
      turler:          sayByKey(P, 'TURU', 10),
      daireler:        sayByKey(P, 'DAIRE', 10),
      dairePersonelTum: sayByKey(P, 'DAIRE', 60),
      mudurlukler:     sayByKey(P, 'MUDURLUK', 10),
      lokasyonlar:     sayByKey(P, 'LOKASYON', 10),
      sendika:         sayByKey(P.map(r => ({ SENDIKA: r.SENDIKA || 'Üye Değil' })), 'SENDIKA', 15),
    },
    sosyal: {
      yardimToplam:     S.reduce((s, r) => s + (Number(r.SAYI)||0), 0),
      evdeBakimToplam:  E.reduce((s, r) => s + (Number(r.SAYI)||0), 0),
      hastaNakilToplam: H.reduce((s, r) => s + (Number(r.SAYI)||0), 0),
      evdeBakimIlceler: sumByKey(E, 'ILCE', 'SAYI', 10),
      hastaNakilIlceler: sumByKey(H, 'ILCE', 'SAYI', 10),
    },
    sehitGazi: {
      toplam:       G.length,
      sehitAilesi:  G.filter(r => r.SEHIT_AILESI_MI === 'EVET').length,
      gazi:         G.filter(r => r.GAZI_MI === 'EVET').length,
      ilceler:      sayByKey(G, 'ILCE', 15),
      engelTurleri: sayByKey(G, 'ENGEL_TURU', 8),
    },
    tasinmaz: {
      toplam:        T.length,
      edinimTurleri: sayByKey(T, 'EDINIM_TURU', 8),
      ilceler:       sayByKey(T, 'ILCE_ADI', 15),
    },
    tahsis: {
      toplam:   TH.length,
      aktif:    TH.filter(r => (r.DURUMU||'').toUpperCase().includes('AKT')).length,
      nedenler: sayByKey(TH, 'TAHSIS_NEDENI', 8),
    },
    // Bugün/yakın doğum günleri (FlexCity günlük olarak filtreler)
    dogumListesi: D.map(r => ({
      adSoyad:  `${r.ADI || ''} ${r.SOYADI || ''}`.trim(),
      daire:    r.DAIRE || '',
      mudurluk: r.MUDURLUK || '',
      tel:      r.TEL || '',
      dogumTarihi: r.DOGUM_TARIHI || '',
    })),
    // Bugün evlilik yıl dönümü olanlar (TC ile personel bilgisinden daire eşleştir)
    evlenmeListesi: EV.map(r => {
      const pb = P.find(p => String(p.TC_KIMLIK_NO) === String(r.TC_KIMLIK_NO));
      return {
        adSoyad:        `${r.ADI || ''} ${r.SOYADI || ''}`.trim(),
        yakin:          r.YAKIN || '',
        yil:            r.YIL || '',
        evlenmeTarihi:  r.EVLENME_TARIHI || '',
        daire:          pb?.DAIRE || '',
        mudurluk:       pb?.MUDURLUK || '',
      };
    }),
  };
}

// BSK_PERSONEL_BILGI cache'ini temizle ve yeniden yükle (scheduler için)
async function refreshPersonelCache() {
  delete _cache['BSK_PERSONEL_BILGI'];
  return getBskDataset('BSK_PERSONEL_BILGI');
}

module.exports = { fetchPersonel, fetchOrgut, getAuthHeader, getBskIstatistik, getBskDataset, refreshPersonelCache };
