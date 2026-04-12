'use strict';
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const epc     = require('../services/servicedesk');
const logger = require('../utils/logger');

router.use(auth);

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
  next();
};
const adminOrManager = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user.role)) return res.status(403).json({ error: 'Yetkisiz' });
  next();
};

// ─── POST /api/servicedesk/test ──────────────────────────────────────────────
router.post('/test', adminOnly, async (req, res) => {
  const { sdp_url, sdp_api_key } = req.body;
  try {
    const result = await epc.testConnection(
      sdp_api_key ? { url: sdp_url, apiKey: sdp_api_key } : null
    );
    res.json(result);
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ─── GET /api/servicedesk/computers ──────────────────────────────────────────
// Sayfalı bilgisayar listesi
router.get('/computers', adminOrManager, async (req, res) => {
  const page      = parseInt(req.query.page)      || 1;
  const pagelimit = parseInt(req.query.pagelimit) || 100;
  try {
    const result = await epc.getComputers({ page, pagelimit });
    res.json(result);
  } catch (err) {
    logger.error('[EPC] computers hatası:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/servicedesk/computers/all ──────────────────────────────────────
// Tüm bilgisayarlar (otomatik sayfalama)
router.get('/computers/all', adminOnly, async (req, res) => {
  try {
    const computers = await epc.getAllComputers();
    res.json({ total: computers.length, computers });
  } catch (err) {
    logger.error('[EPC] all computers hatası:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/servicedesk/computers/:id ──────────────────────────────────────
router.get('/computers/:id', adminOrManager, async (req, res) => {
  try {
    const computer = await epc.getComputerDetail(req.params.id);
    if (!computer) return res.status(404).json({ error: 'Bulunamadı' });
    res.json(computer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/servicedesk/patch-summary ──────────────────────────────────────
router.get('/patch-summary', adminOrManager, async (req, res) => {
  const page      = parseInt(req.query.page)      || 1;
  const pagelimit = parseInt(req.query.pagelimit) || 50;
  try {
    const result = await epc.getPatchSummary({ page, pagelimit });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/servicedesk/sync ──────────────────────────────────────────────
// EPC bilgisayarlarını Device tablosuna senkronize et
router.post('/sync', adminOnly, async (req, res) => {
  try {
    const result = await epc.syncToInventory();
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('[EPC] sync hatası:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/servicedesk/status ─────────────────────────────────────────────
router.get('/status', adminOrManager, async (req, res) => {
  const configured = !!(process.env.SDP_URL && process.env.SDP_API_KEY);
  res.json({ configured, url: process.env.SDP_URL || '' });
});

module.exports = router;
