const express = require('express');
const router  = express.Router();
const auth = require('../middleware/authMiddleware');
const svc  = require('../services/muhtarbis');

// Tüm endpoint'ler auth gerektirir
router.use(auth);

// GET /api/muhtarbis/stats?yil=2025
router.get('/stats', async (req, res) => {
  try {
    const data = await svc.getStats({ yil: req.query.yil });
    res.json(data);
  } catch (e) {
    console.error('[muhtarbis] stats:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/muhtarbis/daire-dagilim?yil=2025
router.get('/daire-dagilim', async (req, res) => {
  try {
    const data = await svc.getDaireDagilim({ yil: req.query.yil });
    res.json(data);
  } catch (e) {
    console.error('[muhtarbis] daire-dagilim:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/muhtarbis/ilce-dagilim?yil=2025
router.get('/ilce-dagilim', async (req, res) => {
  try {
    const data = await svc.getIlceDagilim({ yil: req.query.yil });
    res.json(data);
  } catch (e) {
    console.error('[muhtarbis] ilce-dagilim:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/muhtarbis/liste?ilce=MİLAS&daire=...&durum=...&tur=...&yil=2025&q=...&sayfa=1&limit=50
router.get('/liste', async (req, res) => {
  try {
    const data = await svc.getListe(req.query);
    res.json(data);
  } catch (e) {
    console.error('[muhtarbis] liste:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/muhtarbis/filtreler
router.get('/filtreler', async (req, res) => {
  try {
    const data = await svc.getFilterOptions();
    res.json(data);
  } catch (e) {
    console.error('[muhtarbis] filtreler:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
