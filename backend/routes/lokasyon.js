const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const auth    = require('../middleware/authMiddleware');

router.use(auth);

// GET /api/lokasyon — tüm aktif lokasyonlar (personelSayisi'na göre sıralı)
router.get('/', async (req, res) => {
  try {
    const lokasyonlar = await prisma.lokasyon.findMany({
      where:   { aktif: true },
      orderBy: { personelSayisi: 'desc' },
    });
    res.json(lokasyonlar);
  } catch (err) {
    console.error('[lokasyon]', err);
    res.status(500).json({ error: 'Lokasyonlar alınamadı' });
  }
});

// GET /api/lokasyon/benim — token'daki city alanı üzerinden
router.get('/benim', async (req, res) => {
  try {
    const city = req.user.city;
    if (!city || city === '-') return res.json({ lokasyon: null, personel: [] });

    const [lokasyon, personel] = await Promise.all([
      prisma.lokasyon.findUnique({ where: { ad: city } }),
      prisma.user.findMany({
        where:   { city, active: true },
        select:  { username: true, displayName: true, title: true, directorate: true, department: true },
        orderBy: { displayName: 'asc' },
        take:    30,
      }),
    ]);

    res.json({ lokasyon, personel });
  } catch (err) {
    console.error('[lokasyon/benim]', err);
    res.status(500).json({ error: 'Lokasyon verisi alınamadı' });
  }
});

// GET /api/lokasyon/ilce/:ilce — ilçeye göre lokasyonlar
router.get('/ilce/:ilce', async (req, res) => {
  try {
    const lokasyonlar = await prisma.lokasyon.findMany({
      where:   { ilce: { contains: req.params.ilce, mode: 'insensitive' }, aktif: true },
      orderBy: { personelSayisi: 'desc' },
    });
    res.json(lokasyonlar);
  } catch (err) {
    res.status(500).json({ error: 'Lokasyonlar alınamadı' });
  }
});

// GET /api/lokasyon/:id — tekil lokasyon + personel listesi
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const lokasyon = await prisma.lokasyon.findUnique({ where: { id } });
    if (!lokasyon) return res.status(404).json({ error: 'Bulunamadı' });

    const personel = await prisma.user.findMany({
      where:   { city: lokasyon.ad, active: true },
      select:  { username: true, displayName: true, title: true, directorate: true, department: true },
      orderBy: { displayName: 'asc' },
    });

    res.json({ lokasyon, personel });
  } catch (err) {
    res.status(500).json({ error: 'Lokasyon alınamadı' });
  }
});

// PUT /api/lokasyon/:id — koordinat + meta güncelle (admin only)
router.put('/:id', async (req, res) => {
  const rol = req.user.sistemRol || req.user.role;
  if (rol !== 'admin') return res.status(403).json({ error: 'Sadece admin güncelleyebilir' });

  try {
    const { lat, lng, adres, kisaAd, tip, aktif } = req.body;
    const updated = await prisma.lokasyon.update({
      where: { id: parseInt(req.params.id) },
      data:  { lat, lng, adres, kisaAd, tip, aktif },
    });
    res.json(updated);
  } catch (err) {
    console.error('[lokasyon PUT]', err);
    res.status(500).json({ error: 'Güncellenemedi' });
  }
});

module.exports = router;
