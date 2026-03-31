const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const { checkMuhtarlikAccess } = require('../middleware/muhtarlikAuth');
const svc     = require('../services/muhtarbis');

// ─── Muhtar fotoğraf upload ────────────────────────────────────────────────
const FOTO_DIR      = path.join(__dirname, '../public/muhtar-fotolari');
const FOTO_JSON_PATH = path.join(__dirname, '../data/muhtar_fotolar.json');

function normalizeKey(s) {
  return s.toUpperCase()
    .replace(/İ/g,'I').replace(/Ş/g,'S').replace(/Ğ/g,'G')
    .replace(/Ü/g,'U').replace(/Ö/g,'O').replace(/Ç/g,'C')
    .replace(/ı/g,'I').replace(/[^A-Z0-9]/g,'_');
}

// JSON'dan ad_soyad lookup — ilce+mahalle normalize edilerek eşleştirilir
let _fotoJson = null;
function getFotoJson() {
  if (_fotoJson) return _fotoJson;
  try {
    _fotoJson = JSON.parse(fs.readFileSync(FOTO_JSON_PATH, 'utf8'));
  } catch { _fotoJson = {}; }
  return _fotoJson;
}
function lookupMuhtar(ilceRaw, mahalleRaw) {
  const json  = getFotoJson();
  const ilceN = normalizeKey(ilceRaw);
  // JSON key'leri normalize ederek eşleştir
  for (const [ilceKey, mahalleler] of Object.entries(json)) {
    if (normalizeKey(ilceKey) !== ilceN) continue;
    for (const [mahalleKey, bilgi] of Object.entries(mahalleler)) {
      // "ADAKÖY MAHALLESİ MUHTARI" → normalize → ADAKOY_MAHALLESI_MUHTARI
      // mahalle param → ADAKOY veya ADAKOY_MAHALLESI
      const mk = normalizeKey(mahalleKey);
      const mv = normalizeKey(mahalleRaw);
      if (mk === mv || mk.startsWith(mv + '_') || mv.startsWith(mk)) {
        return bilgi; // { ad_soyad, foto }
      }
    }
  }
  return null;
}

const fotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(FOTO_DIR, { recursive: true });
    cb(null, FOTO_DIR);
  },
  filename: (req, file, cb) => {
    const ilce    = normalizeKey(decodeURIComponent(req.params.ilce));
    const mahalle = normalizeKey(decodeURIComponent(req.params.mahalle));
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${ilce}_${mahalle}${ext}`);
  },
});
const fotoUpload = multer({
  storage: fotoStorage,
  fileFilter: (req, file, cb) => cb(null, /image\/(jpeg|png|webp)/.test(file.mimetype)),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(auth, checkMuhtarlikAccess);

// GET /api/muhtarbis/stats?yil=2025
router.get('/stats', async (req, res) => {
  try { res.json(await svc.getStats({ yil: req.query.yil })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/daire-dagilim?yil=2025
router.get('/daire-dagilim', async (req, res) => {
  try { res.json(await svc.getDaireDagilim({ yil: req.query.yil })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/ilce-dagilim?yil=2025
router.get('/ilce-dagilim', async (req, res) => {
  try { res.json(await svc.getIlceDagilim({ yil: req.query.yil })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/liste?ilce=..&mahalle=..&daire=..&durum=..&yil=..&q=..&sayfa=1&limit=50
router.get('/liste', async (req, res) => {
  try { res.json(await svc.getListe(req.query)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/filtreler?ilce=BODRUM
router.get('/filtreler', async (req, res) => {
  try { res.json(await svc.getFilterOptions({ ilce: req.query.ilce })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Başvuru CRUD ──────────────────────────────────────────────────────────

// ─── Ek dosya upload (dilekçe) ────────────────────────────────────────────
const EKLENTI_DIR = path.join(__dirname, '../public/basvuru-eklentileri');
const ekDosyaUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => { fs.mkdirSync(EKLENTI_DIR, { recursive: true }); cb(null, EKLENTI_DIR); },
    filename:    (req, file, cb) => {
      const ts  = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `basvuru_${ts}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => cb(null, /pdf|image/.test(file.mimetype)),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /api/muhtarbis/basvuru  — yeni başvuru (multipart destekli)
router.post('/basvuru', ekDosyaUpload.single('ekDosya'), async (req, res) => {
  try {
    const body = { ...req.body, user: req.user };
    if (req.file) body.ekDosyaUrl = `/basvuru-eklentileri/${req.file.filename}`;
    if (body.koordinasyonDaireleri && typeof body.koordinasyonDaireleri === 'string') {
      try { body.koordinasyonDaireleri = JSON.parse(body.koordinasyonDaireleri); } catch (_) {}
    }
    res.json(await svc.createBasvuru(body));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/muhtarbis/yatirim  — yeni yatırım
router.post('/yatirim', async (req, res) => {
  try { res.json(await svc.createYatirim({ ...req.body, user: req.user })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/muhtarbis/basvuru/:objectId
router.put('/basvuru/:objectId', async (req, res) => {
  try {
    const result = await svc.updateBasvuru({
      objectId: req.params.objectId,
      fields:   req.body,
    });
    if (result.degisiklik) {
      await svc.saveEditLog({
        objectId: req.params.objectId,
        changes:  result.changes,
        user:     req.user,
      });
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/muhtarbis/basvuru/:objectId/log
router.get('/basvuru/:objectId/log', async (req, res) => {
  try { res.json(await svc.getEditLog(req.params.objectId)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Mahalle detay ────────────────────────────────────────────────────────

// GET /api/muhtarbis/mahalle/:ilce/:mahalle
router.get('/mahalle/:ilce/:mahalle', async (req, res) => {
  try {
    res.json(await svc.getMahalleDetay({
      ilce:    decodeURIComponent(req.params.ilce),
      mahalle: decodeURIComponent(req.params.mahalle),
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/muhtarbis/mahalle/:ilce/:mahalle/basvurular?durum=&sayfa=1
router.get('/mahalle/:ilce/:mahalle/basvurular', async (req, res) => {
  try {
    res.json(await svc.getMahalleBasvurular({
      ilce:    decodeURIComponent(req.params.ilce),
      mahalle: decodeURIComponent(req.params.mahalle),
      durum:   req.query.durum,
      sayfa:   req.query.sayfa,
      limit:   req.query.limit,
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/muhtarbis/mahalle/:ilce/:mahalle/yatirimlar
router.get('/mahalle/:ilce/:mahalle/yatirimlar', async (req, res) => {
  try {
    res.json(svc.getMahalleYatirimlar({
      ilce:    decodeURIComponent(req.params.ilce),
      mahalle: decodeURIComponent(req.params.mahalle),
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/muhtarbis/yatirim/:ilce/:mahalle/:index
router.put('/yatirim/:ilce/:mahalle/:index', async (req, res) => {
  try {
    const result = await svc.updateYatirim({
      ilce:    decodeURIComponent(req.params.ilce),
      mahalle: decodeURIComponent(req.params.mahalle),
      index:   req.params.index,
      fields:  req.body,
      user:    req.user,
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Yatırımlar (statik JSON) ─────────────────────────────────────────────

// GET /api/muhtarbis/yatirimlar?ilce=BODRUM&mahalle=...&search=...
router.get('/yatirimlar', (req, res) => {
  try {
    const data = require('../data/yatirimlar.json');
    const { ilce, mahalle, search } = req.query;

    if (ilce && data[ilce]) {
      if (mahalle && data[ilce][mahalle]) {
        return res.json({ [mahalle]: data[ilce][mahalle] });
      }
      if (search) {
        const s = search.toLowerCase();
        const result = {};
        for (const [m, d] of Object.entries(data[ilce])) {
          const isler = d[3].filter(i => i[2].toLowerCase().includes(s));
          if (m.toLowerCase().includes(s) || isler.length > 0) {
            result[m] = [d[0], d[1], d[2], isler.length > 0 ? isler : d[3]];
          }
        }
        return res.json(result);
      }
      // Mahalle listesi — talep sayısı döndür
      const summary = {};
      for (const [m, d] of Object.entries(data[ilce])) {
        summary[m] = [d[0], d[1], d[2], d[3].length];
      }
      return res.json(summary);
    }

    // İlçe özeti
    const stats = {};
    for (const [il, mahalleler] of Object.entries(data)) {
      stats[il] = {
        mahalle: Object.keys(mahalleler).length,
        talep:   Object.values(mahalleler).reduce((t, m) => t + (Array.isArray(m[3]) ? m[3].length : (m[3] || 0)), 0),
      };
    }
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/muhtarbis/yatirimlar/liste?ilce=&mahalle=&durum=&arama=&sayfa=1&limit=50
router.get('/yatirimlar/liste', auth, (req, res) => {
  try {
    const data = require('../data/yatirimlar.json');
    const { ilce, mahalle, durum, arama, sayfa = 1, limit = 50 } = req.query;
    const rows = [];

    for (const [il, mahalleler] of Object.entries(data)) {
      if (ilce && il !== ilce) continue;
      for (const [mah, d] of Object.entries(mahalleler)) {
        if (mahalle && mah !== mahalle) continue;
        const talepler = Array.isArray(d[3]) ? d[3] : [];
        talepler.forEach((t, idx) => {
          // t format: [tarih, daire, aciklama, cevap, tarih_sort, durum, tahmini_bedel?]
          const row = {
            ilce: il, mahalle: mah,
            tarih:         t[0] || '',
            daire:         t[1] || '',
            aciklama:      t[2] || '',
            cevap:         t[3] || '',
            tarih_sort:    t[4] || t[0] || '',
            durum:         t[5] || '',
            tahmini_bedel: t[6] || '',
            index: idx,
          };
          if (durum && row.durum !== durum) return;
          if (arama && !row.aciklama.toLowerCase().includes(arama.toLowerCase())) return;
          rows.push(row);
        });
      }
    }

    rows.sort((a, b) => (b.tarih_sort || '').localeCompare(a.tarih_sort || ''));

    const pg    = Math.max(1, +sayfa);
    const lm    = Math.min(500, Math.max(1, +limit));
    const start = (pg - 1) * lm;
    res.json({ rows: rows.slice(start, start + lm), toplam: rows.length, sayfa: pg, limit: lm });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Muhtarlar listesi ────────────────────────────────────────────────────

// GET /api/muhtarbis/muhtarlar?ilce=&sayfa=1&limit=50&q=
router.get('/muhtarlar', auth, (req, res) => {
  try {
    const data    = require('../data/yatirimlar.json');
    const { ilce, sayfa = 1, limit = 50, q } = req.query;
    const rows = [];
    for (const [il, mahalleler] of Object.entries(data)) {
      if (ilce && il !== ilce) continue;
      for (const [mahalle, d] of Object.entries(mahalleler)) {
        const talepler = Array.isArray(d[3]) ? d[3] : [];
        rows.push({
          ilce: il,
          mahalle,
          ad_soyad: d[0] || '—',
          nufus: d[1] || 0,
          kirsal_merkez: d[2] || '',
          toplamTalep: talepler.length,
          tamamlanan: talepler.filter(t => t[5] === 'Tamamlandı').length,
        });
      }
    }
    rows.sort((a, b) => a.ilce.localeCompare(b.ilce, 'tr') || a.mahalle.localeCompare(b.mahalle, 'tr'));
    const filtered = q
      ? rows.filter(r => r.mahalle.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')) || r.ad_soyad.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')))
      : rows;
    const pg    = Math.max(1, +sayfa);
    const lm    = Math.min(10000, Math.max(1, +limit));
    const start = (pg - 1) * lm;
    res.json({ rows: filtered.slice(start, start + lm), toplam: filtered.length, sayfa: pg, limit: lm });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Muhtar fotoğraf toplu endpoint ──────────────────────────────────────
let fotolarCache = null, fotolarCacheTime = 0;

// GET /api/muhtarbis/muhtar-fotolar?ilce=BODRUM
// Tüm JSON'u veya ilçe bazlı döner — 60s in-memory cache
router.get('/muhtar-fotolar', auth, (req, res) => {
  const now = Date.now();
  if (!fotolarCache || now - fotolarCacheTime > 60000) {
    try {
      fotolarCache = JSON.parse(fs.readFileSync(FOTO_JSON_PATH, 'utf8'));
      fotolarCacheTime = now;
    } catch { return res.json({}); }
  }
  const ilce = req.query.ilce;
  if (ilce && fotolarCache[ilce]) return res.json({ [ilce]: fotolarCache[ilce] });
  res.json(fotolarCache);
});

// ─── Muhtar fotoğraf GET / POST ───────────────────────────────────────────

// GET /api/muhtarbis/muhtar-foto/:ilce/:mahalle
// Döner: { var: bool, url: string|null, ad_soyad: string|null }
router.get('/muhtar-foto/:ilce/:mahalle', auth, (req, res) => {
  const ilceRaw    = decodeURIComponent(req.params.ilce);
  const mahalleRaw = decodeURIComponent(req.params.mahalle);
  const ilce       = normalizeKey(ilceRaw);
  const mahalle    = normalizeKey(mahalleRaw);

  // JSON'dan muhtar adı
  const bilgi    = lookupMuhtar(ilceRaw, mahalleRaw);
  const ad_soyad = bilgi?.ad_soyad ?? null;

  // Önce JSON'dan dosya adını dene
  if (bilgi?.foto) {
    const jsonFname = bilgi.foto;
    if (fs.existsSync(path.join(FOTO_DIR, jsonFname))) {
      return res.json({ var: true, url: `/muhtar-foto/${jsonFname}`, ad_soyad });
    }
  }

  // Fallback: dosya adı tahmin et
  const base     = `${ilce}_${mahalle}`;
  const suffixes = ['', '_MUHTARI', '_MUHTARLIGI'];
  const exts     = ['.jpg', '.jpeg', '.png', '.PNG', '.JPG'];
  for (const sfx of suffixes) {
    for (const ext of exts) {
      const fname = `${base}${sfx}${ext}`;
      if (fs.existsSync(path.join(FOTO_DIR, fname))) {
        return res.json({ var: true, url: `/muhtar-foto/${fname}`, ad_soyad });
      }
    }
  }
  res.json({ var: false, url: null, ad_soyad });
});

// POST /api/muhtarbis/muhtar-foto/:ilce/:mahalle
router.post('/muhtar-foto/:ilce/:mahalle', auth, fotoUpload.single('foto'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Dosya yok' });
  res.json({ success: true, url: `/muhtar-foto/${req.file.filename}` });
});

// ─── Konu autocomplete ────────────────────────────────────────────────────

let konularCache = null;
let konularCacheTime = 0;

router.get('/konular', async (req, res) => {
  try {
    const now = Date.now();
    if (konularCache && now - konularCacheTime < 3600000) {
      return res.json({ konular: konularCache });
    }
    const pool = await svc.getPool();
    const result = await pool.request().query(
      `SELECT DISTINCT KONUSU FROM view_Mahalle_Basvuru_AtananIs
       WHERE KONUSU IS NOT NULL AND LEN(KONUSU) > 2
       ORDER BY KONUSU`
    );
    konularCache = result.recordset.map(r => r.KONUSU);
    konularCacheTime = now;
    res.json({ konular: konularCache });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Daire kısa adı ───────────────────────────────────────────────────────
function kisaDaire(ad) {
  if (!ad) return 'Diğer';
  const a = ad.toUpperCase()
    .replace(/İ/g,'I').replace(/Ş/g,'S').replace(/Ğ/g,'G')
    .replace(/Ü/g,'U').replace(/Ö/g,'O').replace(/Ç/g,'C').replace(/ı/g,'I');
  if (a.includes('MUSKI'))         return 'MUSKİ';
  if (a.includes('FEN IS'))        return 'Fen İşleri';
  if (a.includes('SAGLIK'))        return 'Sağlık';
  if (a.includes('ULASIM'))        return 'Ulaşım';
  if (a.includes('TARIM'))         return 'Tarımsal';
  if (a.includes('DESTEK'))        return 'Destek';
  if (a.includes('MUHTARLIK'))     return 'Muhtarlık İşl.';
  if (a.includes('CEVRE'))         return 'Çevre Koruma';
  if (a.includes('ITFAIYE'))       return 'İtfaiye';
  if (a.includes('BILGI ISLEM'))   return 'Bilgi İşlem';
  if (a.includes('IMAR'))          return 'İmar';
  if (a.includes('KULTUR'))        return 'Kültür';
  if (a.includes('INSAAT'))        return 'İnşaat';
  if (a.includes('PARK'))          return 'Park & Bahçe';
  if (a.includes('YAZI IS'))       return 'Yazı İşleri';
  if (a.includes('MALI'))          return 'Mali İşler';
  if (a.includes('INSAN'))         return 'İnsan Kay.';
  if (a.includes('HUKUK'))         return 'Hukuk';
  if (a.includes('STRATEJI'))      return 'Strateji';
  if (a.includes('SPOR'))          return 'Spor';
  if (a.includes('KADIN'))         return 'Kadın & Aile';
  if (a.includes('GENCLIK'))       return 'Gençlik';
  if (a.includes('ETUD') || a.includes('PROJE')) return 'Etüd & Proje';
  if (a.includes('SOSYAL') && a.includes('YAR')) return 'Sos. Yardım';
  return ad
    .replace(/\s*(Daire(si)?\s*Başkanlığı|Genel Müdürlüğü|Müdürlüğü)\s*/gi, '')
    .trim().slice(0, 16);
}

// ─── Rapor endpointleri ───────────────────────────────────────────────────

// GET /api/muhtarbis/rapor/yatirim-ozet
router.get('/rapor/yatirim-ozet', auth, (req, res) => {
  try { res.json(svc.getRaporYatirimOzet()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/rapor/ozet
router.get('/rapor/ozet', async (req, res) => {
  try { res.json(await svc.getRaporOzet()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/rapor/ilce/:ilce
router.get('/rapor/ilce/:ilce', async (req, res) => {
  try { res.json(await svc.getRaporIlce(decodeURIComponent(req.params.ilce))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/rapor/konu-dagilim
router.get('/rapor/konu-dagilim', async (req, res) => {
  try {
    const pool = await svc.getPool();
    const result = await pool.request().query(`
      SELECT UPPER(LTRIM(RTRIM(KONUSU))) AS konu,
             COUNT(*) AS toplam,
             SUM(CASE WHEN BIRIM_ISLE = 'Tamamlandı' THEN 1 ELSE 0 END) AS tamamlandi
      FROM view_Mahalle_Basvuru_AtananIs
      WHERE KONUSU IS NOT NULL AND LEN(LTRIM(RTRIM(KONUSU))) > 2
      GROUP BY UPPER(LTRIM(RTRIM(KONUSU)))
      ORDER BY toplam DESC
    `);
    res.json({ konuDagilim: result.recordset.slice(0, 15) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/rapor/daire-tamamlanma
router.get('/rapor/daire-tamamlanma', async (req, res) => {
  try {
    const rows = await svc.getDaireDagilim({});
    const result = rows
      .filter(r => r.toplam > 0)
      .map(r => ({
        daire:        r.daire,
        kisa:         kisaDaire(r.daire),
        toplam:       r.toplam,
        tamamlandi:   r.tamamlandi   || 0,
        devam:        r.devam        || 0,
        tamamlanmadi: r.tamamlanmadi || 0,
        oran: r.toplam > 0 ? Math.round(((r.tamamlandi || 0) / r.toplam) * 100) : 0,
      }))
      .sort((a, b) => b.oran - a.oran);
    res.json({ daireTamamlanma: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/rapor/ilce-tamamlanma
router.get('/rapor/ilce-tamamlanma', async (req, res) => {
  try {
    const rows = await svc.getIlceDagilim({});
    const result = rows
      .filter(r => r.toplam > 0)
      .map(r => ({
        ilce:       r.ilce,
        toplam:     r.toplam,
        tamamlandi: r.tamamlandi || 0,
        devam:      r.devam      || 0,
        oran: r.toplam > 0 ? Math.round(((r.tamamlandi || 0) / r.toplam) * 100) : 0,
      }));
    res.json({ ilceTamamlanma: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/rapor/donem?tip=hafta|ay|yil
router.get('/rapor/donem', async (req, res) => {
  try { res.json(await svc.getRaporDonem(req.query.tip || 'ay')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
