'use strict';
const router = require('express').Router();
const prisma  = require('../lib/prisma');
const auth    = require('../middleware/authMiddleware');

router.use(auth);

// GET /api/islem-gecmisi
router.get('/', async (req, res) => {
  try {
    const { modul, kullanici, islem, baslangic, bitis, sayfa = 1, limit = 50 } = req.query;
    const where = {};
    if (modul)     where.modul     = modul;
    if (islem)     where.islem     = islem;
    if (kullanici) where.kullanici = { contains: kullanici, mode: 'insensitive' };
    if (baslangic || bitis) {
      where.tarih = {};
      if (baslangic) where.tarih.gte = new Date(baslangic);
      if (bitis)     where.tarih.lte = new Date(bitis + 'T23:59:59');
    }
    const pg = Math.max(1, +sayfa);
    const lm = Math.min(200, Math.max(1, +limit));
    const [toplam, kayitlar] = await Promise.all([
      prisma.islemGecmisi.count({ where }),
      prisma.islemGecmisi.findMany({
        where,
        orderBy: { tarih: 'desc' },
        skip: (pg - 1) * lm,
        take: lm,
      }),
    ]);
    res.json({ kayitlar, toplam, sayfa: pg, toplamSayfa: Math.ceil(toplam / lm) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
