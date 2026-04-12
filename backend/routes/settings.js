const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const { getSistemRol } = require('../middleware/rbac');
const logger = require('../utils/logger');

router.use(authMiddleware);

// Hassas anahtar kelimeler — sadece admin görebilir (maskelenmiş)
const HASSAS_PATTERN = /password|secret|apikey|token|credentials|smtp.*pass|ldap.*pass|flexcity.*sec/i;
// Genel kullanıcıya açık güvenli ayarlar
const GENEL_PATTERN = /kurumAdi|varsayilanDil|uygulamaUrl|oturumSuresi|logo|tema|dil|title|name/i;

// ─── GET /api/settings ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const rows = await prisma.setting.findMany();
    const rol = getSistemRol(req.user);

    if (rol === 'admin') {
      // Admin tüm ayarları görür ama hassas değerler maskelenir
      const obj = Object.fromEntries(rows.map(r => [
        r.key,
        HASSAS_PATTERN.test(r.key) ? '***' : r.value,
      ]));
      return res.json(obj);
    }

    // Normal kullanıcı sadece genel ayarları görür
    const obj = Object.fromEntries(
      rows.filter(r => GENEL_PATTERN.test(r.key))
          .map(r => [r.key, r.value])
    );
    res.json(obj);
  } catch (err) {
    logger.error(err);
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
    logger.error(err);
    res.status(500).json({ error: 'Ayarlar kaydedilemedi' });
  }
});

module.exports = router;
