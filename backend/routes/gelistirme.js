'use strict';
const router = require('express').Router();
const prisma  = require('../lib/prisma');
const auth    = require('../middleware/authMiddleware');
const { logIslem } = require('../middleware/auditLog');

router.use(auth);

// GET /api/gelistirme/istatistik
router.get('/istatistik', async (req, res) => {
  try {
    const [toplam, beklemede, inceleniyor, tamamlandi, reddedildi] = await Promise.all([
      prisma.gelistirmeTalebi.count(),
      prisma.gelistirmeTalebi.count({ where: { durum: 'beklemede' } }),
      prisma.gelistirmeTalebi.count({ where: { durum: 'inceleniyor' } }),
      prisma.gelistirmeTalebi.count({ where: { durum: 'tamamlandi' } }),
      prisma.gelistirmeTalebi.count({ where: { durum: 'reddedildi' } }),
    ]);
    res.json({ toplam, beklemede, inceleniyor, tamamlandi, reddedildi });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/gelistirme
router.get('/', async (req, res) => {
  try {
    const { durum, aciliyet, sayfa = 1, limit = 30 } = req.query;
    const where = {};
    if (durum)    where.durum    = durum;
    if (aciliyet) where.aciliyet = aciliyet;
    const pg = Math.max(1, +sayfa);
    const lm = Math.min(100, Math.max(1, +limit));
    const [toplam, talepler] = await Promise.all([
      prisma.gelistirmeTalebi.count({ where }),
      prisma.gelistirmeTalebi.findMany({
        where,
        orderBy: { olusturmaTarih: 'desc' },
        skip: (pg - 1) * lm,
        take: lm,
      }),
    ]);
    res.json({ talepler, toplam, sayfa: pg, toplamSayfa: Math.ceil(toplam / lm) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/gelistirme
router.post('/', async (req, res) => {
  try {
    const { konu, icerik, aciliyet, baskaAdina } = req.body;
    if (!konu || !icerik) return res.status(400).json({ error: 'Konu ve içerik zorunlu' });
    const t = await prisma.gelistirmeTalebi.create({
      data: {
        talepEden:   req.user?.username   || 'bilinmiyor',
        talepEdenAd: req.user?.displayName || null,
        baskaAdina:  baskaAdina || null,
        konu,
        icerik,
        aciliyet: aciliyet || 'normal',
      },
    });
    logIslem({ kullanici: req.user?.username, kullaniciAd: req.user?.displayName, islem: 'CREATE', modul: 'gelistirme', kayitId: t.id, detay: { konu, aciliyet }, ip: req.ip });
    res.status(201).json(t);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/gelistirme/:id
router.put('/:id', async (req, res) => {
  try {
    const rol = req.user?.sistemRol || req.user?.role;
    if (!['admin', 'mudur', 'daire_baskani'].includes(rol)) {
      return res.status(403).json({ error: 'Yetki yok' });
    }
    const { durum, yanit } = req.body;
    const data = {};
    if (durum !== undefined) data.durum = durum;
    if (yanit !== undefined) data.yanit = yanit;
    const t = await prisma.gelistirmeTalebi.update({ where: { id: +req.params.id }, data });
    logIslem({ kullanici: req.user?.username, kullaniciAd: req.user?.displayName, islem: 'UPDATE', modul: 'gelistirme', kayitId: req.params.id, detay: { durum, yanit }, ip: req.ip });
    res.json(t);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
