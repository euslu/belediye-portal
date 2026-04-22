const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

router.use(authMiddleware);

// ─── GET /api/categories ──────────────────────────────────────────────────────
// ?typeId=X  → tipin kategorilerini getir
// ?all=true  → pasifler dahil
router.get('/', async (req, res) => {
  try {
    const where = req.query.all === 'true' ? {} : { active: true };
    if (req.query.typeId) where.typeId = parseInt(req.query.typeId);

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        submitType:     { select: { id: true, name: true, key: true, color: true } },
        assignedGroup:  { select: { id: true, name: true } },
        _count:         { select: { subjects: true, tickets: true } },
      },
    });
    res.json(categories);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Kategoriler alınamadı' });
  }
});

// ─── POST /api/categories ────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
  const { name, icon, typeId, assignedGroupId, slaHours, slaWarningHours } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Kategori adı zorunludur' });
  try {
    const category = await prisma.category.create({
      data: {
        name:            name.trim(),
        icon:            icon || null,
        typeId:          typeId          ? parseInt(typeId)          : null,
        assignedGroupId: assignedGroupId ? parseInt(assignedGroupId) : null,
        slaHours:        slaHours != null ? parseInt(slaHours)       : null,
        slaWarningHours: slaWarningHours != null ? parseInt(slaWarningHours) : null,
      },
      include: {
        submitType:    { select: { id: true, name: true, key: true, color: true } },
        assignedGroup: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Bu kategori zaten mevcut' });
    logger.error(err);
    res.status(500).json({ error: 'Kategori oluşturulamadı' });
  }
});

// ─── PATCH /api/categories/:id ───────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
  const id = parseInt(req.params.id);
  const { name, active, icon, typeId, assignedGroupId, slaHours, slaWarningHours } = req.body;
  const data = {};
  if (name            !== undefined) data.name            = name.trim();
  if (active          !== undefined) data.active          = active;
  if (icon            !== undefined) data.icon            = icon;
  if (typeId          !== undefined) data.typeId          = typeId          ? parseInt(typeId)          : null;
  if (assignedGroupId !== undefined) data.assignedGroupId = assignedGroupId ? parseInt(assignedGroupId) : null;
  if (slaHours        !== undefined) data.slaHours        = slaHours != null ? parseInt(slaHours)       : null;
  if (slaWarningHours !== undefined) data.slaWarningHours = slaWarningHours != null ? parseInt(slaWarningHours) : null;
  try {
    const category = await prisma.category.update({
      where: { id },
      data,
      include: {
        submitType:    { select: { id: true, name: true, key: true, color: true } },
        assignedGroup: { select: { id: true, name: true } },
      },
    });
    res.json(category);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Kategori bulunamadı' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Bu isim zaten kullanılıyor' });
    logger.error(err);
    res.status(500).json({ error: 'Kategori güncellenemedi' });
  }
});

// ─── DELETE /api/categories/:id ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
  const id = parseInt(req.params.id);
  try {
    const cat = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { subjects: true, tickets: true } } },
    });
    if (!cat) return res.status(404).json({ error: 'Kategori bulunamadı' });
    if (cat._count.subjects > 0)
      return res.status(409).json({ error: `Bu kategoriye bağlı ${cat._count.subjects} konu var. Önce konuları taşıyın.` });
    if (cat._count.tickets > 0)
      return res.status(409).json({ error: `Bu kategoriye bağlı ${cat._count.tickets} ticket var. Önce pasife alın.` });
    await prisma.category.delete({ where: { id } });
    res.json({ message: 'Kategori silindi' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Kategori silinemedi' });
  }
});

module.exports = router;
