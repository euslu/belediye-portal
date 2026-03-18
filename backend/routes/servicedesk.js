'use strict';
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const sdp     = require('../services/servicedesk');
const prisma  = require('../lib/prisma');

router.use(auth);

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
  next();
};

// POST /api/servicedesk/test
router.post('/test', adminOnly, async (req, res) => {
  const { sdp_url, sdp_api_key } = req.body;
  try {
    const result = await sdp.testConnection({
      url:    (sdp_url || '').replace(/\/$/, ''),
      apiKey: sdp_api_key || '',
    });
    res.json(result);
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// GET /api/servicedesk/settings
router.get('/settings', adminOnly, async (req, res) => {
  const cfg = await sdp.getSdpConfig();
  res.json(cfg);
});

// PATCH /api/servicedesk/settings
router.patch('/settings', adminOnly, async (req, res) => {
  const { sdp_url, sdp_api_key, sdp_enabled } = req.body;
  const entries = [
    ['sdp_url',     sdp_url     ?? ''],
    ['sdp_api_key', sdp_api_key ?? ''],
    ['sdp_enabled', String(sdp_enabled ?? false)],
  ];
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where:  { key },
        update: { value },
        create: { key, value },
      })
    )
  );
  res.json({ success: true });
});

module.exports = router;
