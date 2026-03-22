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

module.exports = router;
