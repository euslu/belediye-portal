'use strict';

const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const auth    = require('../middleware/authMiddleware');
const logger  = require('../utils/logger');

router.use(auth);

// Yardımcı: rol kontrolü
function isYetkili(req) {
  const rol = req.user?.sistemRol || req.user?.role;
  return ['admin', 'manager', 'daire_baskani', 'mudur'].includes(rol);
}

// Daire filtresi oluştur
function daireWhere(req) {
  const rol = req.user?.sistemRol || req.user?.role;
  if (rol === 'admin' || rol === 'manager') return {}; // tümünü gör
  if (rol === 'daire_baskani' && req.user?.directorate) {
    return { portalDaire: req.user.directorate };
  }
  if (rol === 'mudur' && req.user?.department) {
    return { portalMudurluk: req.user.department };
  }
  return { portalDaire: '__YOK__' }; // hiçbir şey gösterme
}

// GET / — bildirim listesi (rol bazlı)
router.get('/', async (req, res) => {
  try {
    if (!isYetkili(req)) return res.status(403).json({ error: 'Yetersiz yetki' });

    const { okundu, sayfa = 1, limit = 20 } = req.query;
    const pg = Math.max(1, parseInt(sayfa));
    const lm = Math.min(100, Math.max(1, parseInt(limit)));

    const where = {
      ...daireWhere(req),
      ...(okundu !== undefined ? { okundu: okundu === 'true' } : {}),
    };

    const [toplam, bildirimler] = await Promise.all([
      prisma.ulakbellBildirim.count({ where }),
      prisma.ulakbellBildirim.findMany({
        where,
        orderBy: { olusturmaTarih: 'desc' },
        skip: (pg - 1) * lm,
        take: lm,
      }),
    ]);

    res.json({ toplam, sayfa: pg, limit: lm, bildirimler });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /sayac — okunmamış bildirim sayısı
router.get('/sayac', async (req, res) => {
  try {
    if (!isYetkili(req)) return res.json({ okunmamis: 0 });

    const where = { okundu: false, ...daireWhere(req) };
    const okunmamis = await prisma.ulakbellBildirim.count({ where });
    res.json({ okunmamis });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /:id/oku — tek bildirim okundu işaretle
router.put('/:id/oku', async (req, res) => {
  try {
    await prisma.ulakbellBildirim.update({
      where: { id: parseInt(req.params.id) },
      data: { okundu: true, okunmaTarih: new Date() },
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /tumunu-oku — tüm bildirimleri okundu işaretle (rol bazlı)
router.put('/tumunu-oku', async (req, res) => {
  try {
    if (!isYetkili(req)) return res.status(403).json({ error: 'Yetersiz yetki' });

    const where = { okundu: false, ...daireWhere(req) };
    const result = await prisma.ulakbellBildirim.updateMany({
      where,
      data: { okundu: true, okunmaTarih: new Date() },
    });
    res.json({ ok: true, guncellenen: result.count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /manuel-poll — admin: polling manuel tetikle
router.post('/manuel-poll', async (req, res) => {
  const rol = req.user?.sistemRol || req.user?.role;
  if (rol !== 'admin') return res.status(403).json({ error: 'Sadece admin' });

  try {
    const { pollYeniBasvurular } = require('../services/ulakbellPoller');
    await pollYeniBasvurular();
    res.json({ ok: true, mesaj: 'Manuel polling tamamlandi' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
