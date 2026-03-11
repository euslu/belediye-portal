const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// ─── GET /api/settings ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const rows = await prisma.setting.findMany();
    const obj  = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json(obj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ayarlar alınamadı' });
  }
});

// ─── PATCH /api/settings ─────────────────────────────────────────────────────
// Body: { key: value, ... }
router.patch('/', async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Yetkisiz' });

  try {
    const entries = Object.entries(req.body);
    if (!entries.length) return res.status(400).json({ error: 'Boş istek' });

    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.setting.upsert({
          where:  { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    const rows = await prisma.setting.findMany();
    res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ayarlar kaydedilemedi' });
  }
});

module.exports = router;
