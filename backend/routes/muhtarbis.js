const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const sql     = require('mssql');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const { checkMuhtarlikAccess, filterIlce, checkYazmaYetkisi } = require('../middleware/muhtarlikAuth');
const svc     = require('../services/muhtarbis');
const prisma  = require('../lib/prisma');
const { logIslem } = require('../middleware/auditLog');

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

// GET /api/muhtarbis/benim-yetkim — kullanıcının ilçe yetki bilgisi
router.get('/benim-yetkim', (req, res) => {
  res.json({
    muhtarlikRole:    req.user.muhtarlikRole,
    tamErisim:        req.user.muhtarlikTamErisim,
    ilceler:          req.user.muhtarlikIlceler,
    yetkiMap:         req.user.muhtarlikYetkiMap,
  });
});

// GET /api/muhtarbis/stats?yil=2025
router.get('/stats', async (req, res) => {
  try {
    const ilce = filterIlce(req, req.query.ilce);
    if (ilce === false) return res.status(403).json({ error: 'Bu ilçe için yetkiniz yok' });
    res.json(await svc.getStatsPG({ yil: req.query.yil, ilce: Array.isArray(ilce) ? ilce : (ilce || undefined) }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/daire-dagilim?yil=2025
router.get('/daire-dagilim', async (req, res) => {
  try {
    const ilce = filterIlce(req, req.query.ilce);
    if (ilce === false) return res.status(403).json({ error: 'Bu ilçe için yetkiniz yok' });
    res.json(await svc.getDaireDagilimPG({ yil: req.query.yil, ilce: Array.isArray(ilce) ? ilce : (ilce || undefined) }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/ilce-dagilim?yil=2025
router.get('/ilce-dagilim', async (req, res) => {
  try {
    const ilce = filterIlce(req, null);
    if (ilce === false) return res.json([]); // hiç yetki yok
    res.json(await svc.getIlceDagilimPG({ yil: req.query.yil, ilceler: Array.isArray(ilce) ? ilce : null }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/liste?ilce=..&mahalle=..&daire=..&durum=..&yil=..&q=..&sayfa=1&limit=50
router.get('/liste', async (req, res) => {
  try {
    const ilce = filterIlce(req, req.query.ilce);
    if (ilce === false) return res.status(403).json({ error: 'Bu ilçe için yetkiniz yok' });
    const params = { ...req.query };
    if (Array.isArray(ilce)) params.ilceler = ilce;
    else if (ilce) params.ilce = ilce;
    res.json(await svc.getListePG(params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/filtreler?ilce=BODRUM
router.get('/filtreler', async (req, res) => {
  try {
    const ilce = filterIlce(req, req.query.ilce);
    if (ilce === false) return res.json({ ilceler: [], mahalleler: [] });
    res.json(await svc.getFilterOptionsPG({ ilce: Array.isArray(ilce) ? null : (ilce || null), ilceler: Array.isArray(ilce) ? ilce : null }));
  } catch (e) { res.status(500).json({ error: e.message }); }
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
    const ilce = req.body.ilce;
    if (!checkYazmaYetkisi(req, ilce)) {
      return res.status(403).json({ error: `${ilce} ilçesi için yazma yetkiniz yok` });
    }
    const body = { ...req.body, user: req.user };
    if (req.file) body.ekDosyaUrl = `/basvuru-eklentileri/${req.file.filename}`;
    if (body.koordinasyonDaireleri && typeof body.koordinasyonDaireleri === 'string') {
      try { body.koordinasyonDaireleri = JSON.parse(body.koordinasyonDaireleri); } catch (_) {}
    }
    const result = await svc.createBasvuruPG(body);
    logIslem({ kullanici: req.user?.username, kullaniciAd: req.user?.displayName, islem: 'CREATE', modul: 'basvuru', kayitId: result?.id, detay: { konu: body.konu, ilce: body.ilce, mahalle: body.mahalle }, ip: req.ip });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/muhtarbis/yatirim  — yeni yatırım
router.post('/yatirim', async (req, res) => {
  try {
    if (!checkYazmaYetkisi(req, req.body.ilce)) {
      return res.status(403).json({ error: `${req.body.ilce} ilçesi için yazma yetkiniz yok` });
    }
    const result = await svc.createYatirim({ ...req.body, user: req.user });
    logIslem({ kullanici: req.user?.username, kullaniciAd: req.user?.displayName, islem: 'CREATE', modul: 'yatirim', detay: { ilce: req.body.ilce, mahalle: req.body.mahalle }, ip: req.ip });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/muhtarbis/basvuru/:objectId
router.put('/basvuru/:objectId', async (req, res) => {
  try {
    const result = await svc.updateBasvuruPG({
      objectId: req.params.objectId,
      fields:   req.body,
      user:     req.user,
    });
    logIslem({ kullanici: req.user?.username, kullaniciAd: req.user?.displayName, islem: 'UPDATE', modul: 'basvuru', kayitId: req.params.objectId, detay: result.changes, ip: req.ip });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/muhtarbis/basvuru/:id  — tekil başvuru + aktiviteler
router.get('/basvuru/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const basvuru = await prisma.basvuru.findFirst({
      where: { OR: [{ id: +id || 0 }, { muhtarbisId: id }] },
    });
    if (!basvuru) return res.status(404).json({ error: 'Başvuru bulunamadı' });
    const aktiviteler = await prisma.basvuruAktivite.findMany({
      where: { basvuruId: basvuru.id }, orderBy: { tarih: 'asc' },
    });
    res.json({ ...basvuru, aktiviteler });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/basvuru/:objectId/log
router.get('/basvuru/:objectId/log', async (req, res) => {
  try { res.json(await svc.getEditLog(req.params.objectId)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/basvuru/:id/aktiviteler
router.get('/basvuru/:id/aktiviteler', auth, async (req, res) => {
  try { res.json(await svc.getAktiviteler(req.params.id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/muhtarbis/basvuru/:id/aktivite  — manuel yorum
router.post('/basvuru/:id/aktivite', auth, async (req, res) => {
  try {
    const { icerik } = req.body;
    if (!icerik?.trim()) return res.status(400).json({ error: 'İçerik gerekli' });
    const basvuruId = +req.params.id;
    const a = await svc.aktiviteEkle({
      basvuruId, tip: 'yorum', icerik: icerik.trim(),
      yapan:   req.user?.username || 'sistem',
      yapanAd: req.user?.displayName || req.user?.username || null,
    });
    res.json(a);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Mahalle detay ────────────────────────────────────────────────────────

// GET /api/muhtarbis/muhtar-bilgi/:ilce/:mahalle
router.get('/muhtar-bilgi/:ilce/:mahalle', async (req, res) => {
  try {
    const ilce    = decodeURIComponent(req.params.ilce);
    const mahalle = decodeURIComponent(req.params.mahalle);
    const muhtar  = await svc.getMuhtarBilgi(ilce, mahalle);
    if (!muhtar) return res.status(404).json({ error: 'Muhtar kaydı bulunamadı' });
    res.json(muhtar);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/muhtarbis/muhtar-bilgi/:ilce/:mahalle
router.put('/muhtar-bilgi/:ilce/:mahalle', async (req, res) => {
  try {
    const ilce    = decodeURIComponent(req.params.ilce);
    const mahalle = decodeURIComponent(req.params.mahalle);
    const result  = await svc.updateMuhtarBilgi(ilce, mahalle, req.body, req.user);
    logIslem({ kullanici: req.user?.username, kullaniciAd: req.user?.displayName, islem: 'UPDATE', modul: 'muhtar', kayitId: `${ilce}/${mahalle}`, detay: req.body, ip: req.ip });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/mahalle/:ilce/:mahalle
router.get('/mahalle/:ilce/:mahalle', async (req, res) => {
  try {
    const ilce = decodeURIComponent(req.params.ilce);
    const izin = filterIlce(req, ilce);
    if (izin === false) return res.status(403).json({ error: `${ilce} ilçesi için yetkiniz yok` });
    res.json(await svc.getMahalleDetayPG({ ilce, mahalle: decodeURIComponent(req.params.mahalle) }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/muhtarbis/mahalle/:ilce/:mahalle/basvurular?durum=&sayfa=1
router.get('/mahalle/:ilce/:mahalle/basvurular', async (req, res) => {
  try {
    res.json(await svc.getMahalleBasvurularPG({
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
    const ilce    = decodeURIComponent(req.params.ilce);
    const mahalle = decodeURIComponent(req.params.mahalle);
    if (!checkYazmaYetkisi(req, ilce)) {
      return res.status(403).json({ error: `${ilce} ilçesi için yazma yetkiniz yok` });
    }
    const result  = await svc.updateYatirim({ ilce, mahalle, index: req.params.index, fields: req.body, user: req.user });
    logIslem({ kullanici: req.user?.username, kullaniciAd: req.user?.displayName, islem: 'UPDATE', modul: 'yatirim', kayitId: `${ilce}/${mahalle}/${req.params.index}`, detay: req.body, ip: req.ip });
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
    const izinliIlceler = filterIlce(req, ilce);
    const rows = [];

    for (const [il, mahalleler] of Object.entries(data)) {
      if (Array.isArray(izinliIlceler) && !izinliIlceler.includes(il)) continue;
      if (!Array.isArray(izinliIlceler) && ilce && il !== ilce) continue;
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
router.get('/muhtarlar', auth, async (req, res) => {
  try {
    const ilce = filterIlce(req, req.query.ilce);
    if (ilce === false) return res.status(403).json({ error: 'Bu ilçe için yetkiniz yok' });
    const params = { ...req.query };
    if (Array.isArray(ilce)) params.ilceler = ilce;
    else if (ilce) params.ilce = ilce;
    res.json(await svc.getMuhtarlarPG(params));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Muhtar fotoğraf toplu endpoint ──────────────────────────────────────

// GET /api/muhtarbis/muhtar-fotolar?ilce=BODRUM
// PostgreSQL Muhtar tablosundan gruplu döner
router.get('/muhtar-fotolar', auth, async (req, res) => {
  try {
    const { ilce } = req.query;
    const muhtarlar = await prisma.muhtar.findMany({
      where: ilce ? { ilce } : {},
      orderBy: [{ ilce: 'asc' }, { mahalle: 'asc' }],
    });
    const grouped = {};
    for (const m of muhtarlar) {
      if (!grouped[m.ilce]) grouped[m.ilce] = {};
      grouped[m.ilce][m.mahalle] = {
        ad_soyad: m.muhtarAdi,
        nufus:    m.nufus,
        gsm:      m.gsm,
        foto: `/api/muhtarbis/muhtar-foto/${encodeURIComponent(m.ilce)}/${encodeURIComponent(m.mahalle)}`,
      };
    }
    res.json(grouped);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Muhtar fotoğraf GET / POST ───────────────────────────────────────────

// GET /api/muhtarbis/muhtar-foto/:ilce/:mahalle
// Önce MSSQL binary, sonra statik fallback
router.get('/muhtar-foto/:ilce/:mahalle', auth, async (req, res) => {
  const ilce    = decodeURIComponent(req.params.ilce);
  const mahalle = decodeURIComponent(req.params.mahalle);

  // 1. MSSQL binary stream
  try {
    const pool = await svc.getPool();
    const result = await pool.request()
      .input('ilce',    sql.NVarChar, ilce)
      .input('mahalle', sql.NVarChar, mahalle)
      .query(`
        SELECT TOP 1 a.DATA, a.CONTENT_TYPE
        FROM MUHTARLIK_MAHALLE m
        INNER JOIN MUHTARLIK_MAHALLE__ATTACH a ON m.GLOBALID = a.REL_GLOBALID
        WHERE m.AD_1 = @ilce AND m.AD = @mahalle
          AND (m.GDB_TO_DATE IS NULL OR YEAR(m.GDB_TO_DATE) > 2100)
      `);
    if (result.recordset.length && result.recordset[0].DATA) {
      const foto   = result.recordset[0];
      const buffer = Buffer.isBuffer(foto.DATA) ? foto.DATA : Buffer.from(foto.DATA);
      res.set({
        'Content-Type':   foto.CONTENT_TYPE || 'image/jpeg',
        'Content-Length': buffer.length,
        'Cache-Control':  'public, max-age=86400',
      });
      return res.send(buffer);
    }
  } catch (e) {
    console.error('MSSQL foto hatası:', e.message);
  }

  // 2. Statik dosya fallback
  const ilceN    = normalizeKey(ilce);
  const mahalleN = normalizeKey(mahalle);
  const base     = `${ilceN}_${mahalleN}`;
  const bilgi    = lookupMuhtar(ilce, mahalle);
  if (bilgi?.foto) {
    const p = path.join(FOTO_DIR, bilgi.foto);
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  for (const sfx of ['', '_MUHTARI', '_MUHTARLIGI']) {
    for (const ext of ['.jpg', '.jpeg', '.png', '.PNG', '.JPG']) {
      const p = path.join(FOTO_DIR, `${base}${sfx}${ext}`);
      if (fs.existsSync(p)) return res.sendFile(p);
    }
  }
  res.status(404).json({ error: 'Fotoğraf bulunamadı' });
});

// POST /api/muhtarbis/muhtar-foto/:ilce/:mahalle
router.post('/muhtar-foto/:ilce/:mahalle', auth, fotoUpload.single('foto'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Dosya yok' });
  res.json({ success: true, url: `/muhtar-foto/${req.file.filename}` });
});

// ─── Konu autocomplete ────────────────────────────────────────────────────

router.get('/konular', async (req, res) => {
  try {
    res.json({ konular: await svc.getKonularPG() });
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
    const rows = await svc.getDaireDagilimPG({});
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
    const rows = await svc.getIlceDagilimPG({});
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

// GET /api/muhtarbis/rapor/donem?tip=gunluk|haftalik|aylik|hafta|ay|yil
router.get('/rapor/donem', async (req, res) => {
  try { res.json(await svc.getRaporDonem(req.query.tip || 'ay')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/rapor/aylik-karsilastirma?ay1=2025-03&ay2=2025-04
router.get('/rapor/aylik-karsilastirma', async (req, res) => {
  try {
    const ay1 = req.query.ay1 || new Date().toISOString().slice(0,7);
    const prev = new Date(); prev.setMonth(prev.getMonth() - 1);
    const ay2 = req.query.ay2 || prev.toISOString().slice(0,7);
    res.json(await svc.getRaporAylikKarsilastirma(ay1, ay2));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/muhtarbis/rapor/olustur
router.post('/rapor/olustur', async (req, res) => {
  try { res.json(await svc.getRaporOlustur(req.body || {})); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/rapor/export?ilce=&daire=&durum=&baslangic=&bitis=
router.get('/rapor/export', async (req, res) => {
  try {
    let ExcelJS;
    try { ExcelJS = require('exceljs'); } catch (_) {
      return res.status(500).json({ error: 'exceljs paketi yüklü değil. npm install exceljs' });
    }
    const data = await svc.getRaporExportData(req.query);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Başvurular');
    ws.columns = [
      { header: 'İlçe',       key: 'ilce',      width: 16 },
      { header: 'Mahalle',    key: 'mahalle',   width: 20 },
      { header: 'Konu',       key: 'konu',      width: 40 },
      { header: 'Daire',      key: 'daire',     width: 30 },
      { header: 'Durum',      key: 'durum',     width: 16 },
      { header: 'Tarih',      key: 'tarih',     width: 14 },
      { header: 'Cevap',      key: 'cevap',     width: 40 },
      { header: 'Süre (gün)', key: 'cevapSure', width: 12 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A2F' } };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    data.rows.forEach(row => ws.addRow(row));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="basvurular_${new Date().toISOString().slice(0,10)}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── MuhtarlikYetki Admin API ────────────────────────────────────────────────
// GET /api/muhtarbis/admin/kullanicilar — MuhtarlikRole listesi
router.get('/admin/kullanicilar', async (req, res) => {
  if (!['admin', 'daire_baskani'].includes(req.user.muhtarlikRole) && req.user.sistemRol !== 'admin') {
    return res.status(403).json({ error: 'Yetersiz yetki' });
  }
  try {
    const roller = await prisma.muhtarlikRole.findMany({
      where: { active: true },
      orderBy: [{ role: 'asc' }, { displayName: 'asc' }],
    });
    res.json(roller);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/muhtarbis/admin/yetkiler?username=
router.get('/admin/yetkiler', async (req, res) => {
  if (!['admin', 'daire_baskani'].includes(req.user.muhtarlikRole) && req.user.sistemRol !== 'admin') {
    return res.status(403).json({ error: 'Yetersiz yetki' });
  }
  try {
    const where = req.query.username ? { username: req.query.username } : {};
    const yetkiler = await prisma.muhtarlikYetki.findMany({
      where, orderBy: [{ username: 'asc' }, { ilce: 'asc' }],
    });
    res.json(yetkiler);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/muhtarbis/admin/yetkiler
router.post('/admin/yetkiler', async (req, res) => {
  if (!['admin', 'daire_baskani'].includes(req.user.muhtarlikRole) && req.user.sistemRol !== 'admin') {
    return res.status(403).json({ error: 'Yetersiz yetki' });
  }
  try {
    const { username, ilce, yetkiTuru = 'okuma' } = req.body;
    if (!username || !ilce) return res.status(400).json({ error: 'username ve ilce gerekli' });
    const yetki = await prisma.muhtarlikYetki.upsert({
      where: { username_ilce: { username, ilce } },
      create: { username, ilce, yetkiTuru, active: true, updatedBy: req.user.username },
      update: { yetkiTuru, active: true, updatedBy: req.user.username },
    });
    res.json(yetki);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/muhtarbis/admin/yetkiler/:id
router.delete('/admin/yetkiler/:id', async (req, res) => {
  if (!['admin', 'daire_baskani'].includes(req.user.muhtarlikRole) && req.user.sistemRol !== 'admin') {
    return res.status(403).json({ error: 'Yetersiz yetki' });
  }
  try {
    await prisma.muhtarlikYetki.delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/muhtarbis/admin/yetkiler/:id
router.patch('/admin/yetkiler/:id', async (req, res) => {
  if (!['admin', 'daire_baskani'].includes(req.user.muhtarlikRole) && req.user.sistemRol !== 'admin') {
    return res.status(403).json({ error: 'Yetersiz yetki' });
  }
  try {
    const { yetkiTuru, active } = req.body;
    const yetki = await prisma.muhtarlikYetki.update({
      where: { id: +req.params.id },
      data: { ...(yetkiTuru !== undefined && { yetkiTuru }), ...(active !== undefined && { active }), updatedBy: req.user.username },
    });
    res.json(yetki);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
