'use strict';
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const pdks    = require('../services/pdks');
const logger  = require('../utils/logger');

router.use(auth);

const PDKS_ACCESS = (req, res, next) => {
  const rol = req.user.sistemRol || req.user.role;
  if (!['admin', 'manager', 'daire_baskani', 'mudur'].includes(rol))
    return res.status(403).json({ error: 'Yetkiniz yok' });
  next();
};

// Müdür → PDKS filtre cache (displayName → "ALT_BIRIM:id1,id2")
const _mudurFilterCache = new Map();

/**
 * Daire filtresi:
 *  - admin/manager: query param veya null (tümü)
 *  - daire_baskani: kendi directorate değeri (PBS_ISYERI LIKE)
 *  - mudur: PDKS'ten ALT_BIRIM_ID listesi (kendi müdürlüğü)
 */
async function getDirFilter(req) {
  const rol = req.user.sistemRol || req.user.role;
  if (rol === 'admin' || rol === 'manager') return req.query.directorate || null;
  if (rol === 'daire_baskani') return req.user.directorate || null;
  if (rol === 'mudur') {
    const name = req.user.displayName;
    if (!name) return null;
    if (_mudurFilterCache.has(name)) return _mudurFilterCache.get(name);
    const result = await pdks.findMudurFilter(name);
    if (result && result.altBirimIds.length) {
      const filterStr = `ALT_BIRIM:${result.altBirimIds.join(',')}`;
      _mudurFilterCache.set(name, filterStr);
      logger.info(`[PDKS] Müdür filtre: ${name} → ${filterStr} (${result.pbsIsyeri})`);
      return filterStr;
    }
    return null;
  }
  return null;
}

// ─── GET /api/pdks/test ─────────────────────────────────────────────────────
router.get('/test', PDKS_ACCESS, async (req, res) => {
  try {
    const result = await pdks.testConnection();
    res.json({ success: true, message: `Bağlantı başarılı — ${result.tableCount} tablo`, tables: result.tables });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ─── GET /api/pdks/overview ─────────────────────────────────────────────────
router.get('/overview', PDKS_ACCESS, async (req, res) => {
  try {
    const { date } = req.query;
    const directorate = await getDirFilter(req);
    const data = await pdks.getOverview(date, directorate);
    res.json(data);
  } catch (err) {
    logger.error('[PDKS] overview hatası:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pdks/attendance ───────────────────────────────────────────────
router.get('/attendance', PDKS_ACCESS, async (req, res) => {
  try {
    const { date } = req.query;
    const directorate = await getDirFilter(req);
    const data = await pdks.getDailyAttendance(date, directorate);
    res.json({ data });
  } catch (err) {
    logger.error('[PDKS] attendance hatası:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pdks/summary ──────────────────────────────────────────────────
router.get('/summary', PDKS_ACCESS, async (req, res) => {
  try {
    const { date } = req.query;
    const data = await pdks.getDepartmentSummary(date);
    res.json({ data });
  } catch (err) {
    logger.error('[PDKS] summary hatası:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pdks/leaves ───────────────────────────────────────────────────
router.get('/leaves', PDKS_ACCESS, async (req, res) => {
  try {
    const { date } = req.query;
    const directorate = await getDirFilter(req);
    const data = await pdks.getLeaveList(date, directorate);
    res.json({ data });
  } catch (err) {
    logger.error('[PDKS] leaves hatası:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pdks/late ─────────────────────────────────────────────────────
router.get('/late', PDKS_ACCESS, async (req, res) => {
  try {
    const { date, limit } = req.query;
    const directorate = await getDirFilter(req);
    const data = await pdks.getLateArrivals(date, directorate, limit || '08:35');
    res.json({ data });
  } catch (err) {
    logger.error('[PDKS] late hatası:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pdks/trend ──────────────────────────────────────────────────
router.get('/trend', PDKS_ACCESS, async (req, res) => {
  try {
    const { period } = req.query;
    const directorate = await getDirFilter(req);
    const data = await pdks.getTrend(period, directorate);
    res.json({ period: period || 'haftalik', data });
  } catch (err) {
    logger.error('[PDKS] trend hatası:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
