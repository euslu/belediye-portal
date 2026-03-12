const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

const ADMIN_ONLY = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkiniz yok' });
  next();
};

// ─── GET /api/departments ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { all } = req.query;
    const where = all === 'true' ? {} : { isActive: true };
    const departments = await prisma.department.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { tickets: true, categories: true } },
      },
    });
    res.json(departments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Daireler alınamadı' });
  }
});

// ─── GET /api/departments/:id ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const dept = await prisma.department.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        _count: { select: { tickets: true } },
      },
    });
    if (!dept) return res.status(404).json({ error: 'Daire bulunamadı' });
    res.json(dept);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Daire alınamadı' });
  }
});

// ─── POST /api/departments ────────────────────────────────────────────────────
router.post('/', ADMIN_ONLY, async (req, res) => {
  const { name, shortCode, description, managerId } = req.body;
  if (!name?.trim())      return res.status(400).json({ error: 'Daire adı zorunludur' });
  if (!shortCode?.trim()) return res.status(400).json({ error: 'Kısa kod zorunludur' });

  try {
    const dept = await prisma.department.create({
      data: {
        name:        name.trim(),
        shortCode:   shortCode.trim().toUpperCase(),
        description: description?.trim() || null,
        managerId:   managerId?.trim()   || null,
      },
    });
    res.status(201).json(dept);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Bu ad veya kısa kod zaten kullanılıyor' });
    console.error(err);
    res.status(500).json({ error: 'Daire oluşturulamadı' });
  }
});

// ─── PATCH /api/departments/:id ───────────────────────────────────────────────
router.patch('/:id', ADMIN_ONLY, async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, shortCode, description, managerId, isActive } = req.body;

  const data = {};
  if (name        !== undefined) data.name        = name.trim();
  if (shortCode   !== undefined) data.shortCode   = shortCode.trim().toUpperCase();
  if (description !== undefined) data.description = description?.trim() || null;
  if (managerId   !== undefined) data.managerId   = managerId?.trim()   || null;
  if (isActive    !== undefined) data.isActive    = isActive;

  try {
    const dept = await prisma.department.update({ where: { id }, data });
    res.json(dept);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Daire bulunamadı' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Bu ad veya kısa kod zaten kullanılıyor' });
    console.error(err);
    res.status(500).json({ error: 'Daire güncellenemedi' });
  }
});

// ─── DELETE /api/departments/:id → pasife al ──────────────────────────────────
router.delete('/:id', ADMIN_ONLY, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.department.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Daire pasife alındı' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Daire bulunamadı' });
    console.error(err);
    res.status(500).json({ error: 'Daire güncellenemedi' });
  }
});

module.exports = router;
