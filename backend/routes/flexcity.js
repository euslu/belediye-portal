const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// ─── POST /api/flexcity/sync ──────────────────────────────────────────────────
router.post('/sync', async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Yetkiniz yok' });
  try {
    const { syncAll } = require('../lib/flexcitySync');
    const result = await syncAll();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/flexcity/orgut ──────────────────────────────────────────────────
router.get('/orgut', async (req, res) => {
  try {
    const orguts = await prisma.flexcityOrgut.findMany({
      where:   { durum: 'Aktif' },
      orderBy: { kod: 'asc' },
    });
    res.json(orguts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/flexcity/orgut/tree ────────────────────────────────────────────
router.get('/orgut/tree', async (req, res) => {
  try {
    const orguts = await prisma.flexcityOrgut.findMany({
      where:   { durum: 'Aktif' },
      orderBy: { kod: 'asc' },
    });

    const map = {};
    orguts.forEach(o => { map[o.id] = { ...o, children: [] }; });

    const roots = [];
    orguts.forEach(o => {
      if (o.ustId && map[o.ustId]) {
        map[o.ustId].children.push(map[o.id]);
      } else {
        roots.push(map[o.id]);
      }
    });

    res.json(roots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/flexcity/istatistik ────────────────────────────────────────────
router.get('/istatistik', async (req, res) => {
  try {
    const { getBskIstatistik } = require('../services/flexcity');
    const data = await getBskIstatistik();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/flexcity/personel-dogum ────────────────────────────────────────
router.get('/personel-dogum', async (req, res) => {
  try {
    const { getBskDataset } = require('../services/flexcity');
    let rows = await getBskDataset('BSK_PERSONEL_DOGUM');
    // Daire filtresi (daire başkanı dashboard'u için)
    const { daire } = req.query;
    if (daire) {
      const d = daire.toLowerCase();
      rows = rows.filter(r => (r.DAIRE || '').toLowerCase().includes(d));
    }
    res.json({
      toplam: rows.length,
      liste: rows.map(r => ({
        ad:          r.ADI    || r.AD    || '',
        soyad:       r.SOYADI || r.SOYAD || '',
        daire:       r.DAIRE  || '',
        mudurluk:    r.MUDURLUK || '',
        dogumTarihi: r.DOGUM_TARIHI || '',
        tel:         r.TEL   || '',
        email:       r.EMAIL || '',
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/flexcity/sosyal ─────────────────────────────────────────────────
router.get('/sosyal', async (req, res) => {
  try {
    const { getBskDataset } = require('../services/flexcity');
    const [evdeBakim, hastaNakil, sehitGazi, sosyalYardim] = await Promise.all([
      getBskDataset('BSK_EVDE_BAKIM'),
      getBskDataset('BSK_HASTA_NAKIL'),
      getBskDataset('BSK_SEHIT_GAZI'),
      getBskDataset('BSK_SOSYAL_YARDIM'),
    ]);

    const sayi = r => parseInt(r.SAYI || r.KISI_SAYISI || 0) || 0;

    const yillikGrupla = arr => {
      const m = {};
      arr.forEach(r => { if (r.YIL) m[r.YIL] = (m[r.YIL] || 0) + sayi(r); });
      return Object.entries(m).sort((a, b) => a[0] - b[0])
        .map(([yil, toplam]) => ({ yil: parseInt(yil), toplam }));
    };

    res.json({
      evdeBakim: {
        kayitSayisi: evdeBakim.length,
        toplamKisi:  evdeBakim.reduce((s, r) => s + sayi(r), 0),
        yillik:      yillikGrupla(evdeBakim),
      },
      hastaNakil: {
        kayitSayisi: hastaNakil.length,
        toplamKisi:  hastaNakil.reduce((s, r) => s + sayi(r), 0),
        yillik:      yillikGrupla(hastaNakil),
      },
      sehitGazi: {
        toplam:      sehitGazi.length,
        sehitAilesi: sehitGazi.filter(r => r.SEHIT_AILESI_MI === 'EVET').length,
        gazi:        sehitGazi.filter(r => r.GAZI_MI        === 'EVET').length,
      },
      sosyalYardim: {
        toplamKisi:  sosyalYardim.reduce((s, r) => s + sayi(r), 0),
        kayitSayisi: sosyalYardim.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/flexcity/tasinmaz ──────────────────────────────────────────────
router.get('/tasinmaz', async (req, res) => {
  try {
    const { getBskDataset } = require('../services/flexcity');
    const rows = await getBskDataset('BSK_TASINMAZ');

    // "726,210,616.06" → 726210616.06  (US thousands comma, decimal dot)
    const parsePara = v => parseFloat(String(v || 0).trim().replace(/,/g, '')) || 0;

    const rayicToplam  = rows.reduce((s, r) => s + parsePara(r.RAYIC_DEGER),   0);
    const guncelToplam = rows.reduce((s, r) => s + parsePara(r.GUNCEL_DEGERI), 0);
    const alanToplam   = rows.reduce((s, r) => s + parsePara(r.YUZ_OLCUMU),   0);

    const toMap = (arr, key) => {
      const m = {};
      arr.forEach(r => { const k = r[key] || 'Diğer'; m[k] = (m[k] || 0) + 1; });
      return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 13)
        .map(([ad, sayi]) => ({ ad, sayi }));
    };

    res.json({
      toplam:            rows.length,
      rayicDegerToplam:  rayicToplam,
      guncelDegerToplam: guncelToplam,
      toplamAlanM2:      alanToplam,
      ilceDagilim:       toMap(rows, 'ILCE_ADI'),
      tapuTurleri:       toMap(rows, 'TAPU_TURU'),
      durumlar:          toMap(rows, 'DURUMU'),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/flexcity/muhtarlik-ozet ────────────────────────────────────────
// Muhtarlıklar anasayfası için özet — 30 dk cache
let _muhtarlikOzetCache = null;
let _muhtarlikOzetAt    = 0;
const MUHTARLIK_TTL     = 30 * 60 * 1000;

router.get('/muhtarlik-ozet', async (req, res) => {
  try {
    if (_muhtarlikOzetCache && Date.now() - _muhtarlikOzetAt < MUHTARLIK_TTL) {
      return res.json(_muhtarlikOzetCache);
    }
    const { getBskIstatistik } = require('../services/flexcity');
    const istatistik = await getBskIstatistik();

    const ozet = {
      mahalle: {
        toplam:  istatistik.mahalle.toplam,
        ilceler: istatistik.mahalle.ilceler,
        partiler: istatistik.mahalle.partiler,
        nufus:   istatistik.mahalle.nufus,
      },
      sosyal: {
        yardimToplam:      istatistik.sosyal.yardimToplam,
        evdeBakimToplam:   istatistik.sosyal.evdeBakimToplam,
        hastaNakilToplam:  istatistik.sosyal.hastaNakilToplam,
        evdeBakimIlceler:  istatistik.sosyal.evdeBakimIlceler,
        hastaNakilIlceler: istatistik.sosyal.hastaNakilIlceler,
      },
      sehitGazi: {
        toplam:      istatistik.sehitGazi.toplam,
        sehit:       istatistik.sehitGazi.sehitAilesi,
        gazi:        istatistik.sehitGazi.gazi,
      },
    };

    _muhtarlikOzetCache = ozet;
    _muhtarlikOzetAt    = Date.now();
    res.json(ozet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
