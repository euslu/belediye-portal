const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const svc     = require('../services/muhtarbis');

router.use(auth);

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

module.exports = router;
