const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// ─── GET /api/locations ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      where:   { active: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { users: true, devices: true } },
      },
    });
    res.json(locations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lokasyonlar alınamadı' });
  }
});

// ─── POST /api/locations ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const { name, address, city } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Lokasyon adı zorunlu' });

  try {
    const loc = await prisma.location.create({
      data: {
        name:    name.trim(),
        address: address?.trim() || null,
        city:    city?.trim()    || null,
      },
    });
    res.status(201).json(loc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lokasyon oluşturulamadı' });
  }
});

// ─── PATCH /api/locations/:id ─────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  const { name, address, city, active } = req.body;
  const data = {};
  if (name    !== undefined) data.name    = name.trim();
  if (address !== undefined) data.address = address?.trim() || null;
  if (city    !== undefined) data.city    = city?.trim()    || null;
  if (active  !== undefined) data.active  = Boolean(active);

  try {
    const loc = await prisma.location.update({ where: { id }, data });
    res.json(loc);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Lokasyon bulunamadı' });
    console.error(err);
    res.status(500).json({ error: 'Lokasyon güncellenemedi' });
  }
});

// ─── DELETE /api/locations/:id ────────────────────────────────────────────────
// Gerçek silme yerine pasife al (kullanıcı/cihaz varsa)
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Sadece adminler silebilir' });

  const id = parseInt(req.params.id);
  try {
    // Bağlı kullanıcı veya cihaz varsa pasife al, yoksa sil
    const [userCount, deviceCount] = await Promise.all([
      prisma.user.count({ where: { locationId: id } }),
      prisma.device.count({ where: { locationId: id } }),
    ]);

    if (userCount > 0 || deviceCount > 0) {
      const loc = await prisma.location.update({ where: { id }, data: { active: false } });
      return res.json({ ok: true, deactivated: true, loc });
    }

    await prisma.location.delete({ where: { id } });
    res.json({ ok: true, deleted: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Lokasyon bulunamadı' });
    console.error(err);
    res.status(500).json({ error: 'Lokasyon silinemedi' });
  }
});

module.exports = router;
