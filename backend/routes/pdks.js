'use strict';
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const pdks    = require('../services/pdks');

router.use(auth);

const ADMIN_MANAGER = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });
  next();
};

// ─── POST /api/pdks/test ──────────────────────────────────────────────────────
router.post('/test', ADMIN_MANAGER, async (req, res) => {
  const { pdks_host, pdks_port, pdks_instance, pdks_db, pdks_user, pdks_password } = req.body;
  if (!pdks_host) return res.json({ success: false, message: 'Host girilmedi' });

  try {
    const result = await pdks.testConnection({
      type:     'mssql',
      host:     pdks_host,
      port:     parseInt(pdks_port) || 1433,
      instance: pdks_instance || '',
      database: pdks_db,
      user:     pdks_user,
      password: pdks_password,
    });
    res.json({
      success: true,
      message: `Bağlantı başarılı — ${result.tableCount} tablo bulundu`,
      tables:  result.tables,
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ─── GET /api/pdks/explore ────────────────────────────────────────────────────
router.get('/explore', ADMIN_MANAGER, async (req, res) => {
  try {
    const result = await pdks.testConnection();
    res.json({ success: true, tables: result.tables });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/pdks/explore/:table ─────────────────────────────────────────────
router.get('/explore/:table', ADMIN_MANAGER, async (req, res) => {
  try {
    const result = await pdks.exploreTable(req.params.table);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pdks/status ─────────────────────────────────────────────────────
router.get('/status', ADMIN_MANAGER, async (req, res) => {
  try {
    const cfg = await pdks.getPdksConfig();
    res.json({ enabled: cfg.enabled, configured: !!(cfg.host && cfg.database) });
  } catch (err) {
    res.json({ enabled: false, configured: false });
  }
});

// ─── GET /api/pdks/attendance ─────────────────────────────────────────────────
router.get('/attendance', ADMIN_MANAGER, async (req, res) => {
  const { date, directorate } = req.query;
  try {
    const rows = await pdks.getDailyAttendance(date, directorate || null);
    if (rows === null) return res.json({ configured: false, data: [] });
    res.json({ configured: true, data: rows });
  } catch (err) {
    console.error('[PDKS] attendance hatası:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pdks/leaves ─────────────────────────────────────────────────────
router.get('/leaves', ADMIN_MANAGER, async (req, res) => {
  const { date } = req.query;
  try {
    const rows = await pdks.getLeaveInfo(date);
    if (rows === null) return res.json({ configured: false, data: [] });
    res.json({ configured: true, data: rows });
  } catch (err) {
    console.error('[PDKS] leaves hatası:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pdks/summary ────────────────────────────────────────────────────
router.get('/summary', ADMIN_MANAGER, async (req, res) => {
  const { date } = req.query;
  try {
    const rows = await pdks.getDepartmentSummary(date);
    if (rows === null) return res.json({ configured: false, data: [] });
    res.json({ configured: true, data: rows });
  } catch (err) {
    console.error('[PDKS] summary hatası:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
