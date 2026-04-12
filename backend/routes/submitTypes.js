const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

router.use(authMiddleware);

// ─── GET /api/submit-types ────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const where = req.query.all === 'true' ? {} : { active: true };
    const types = await prisma.submitType.findMany({
      where,
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
    res.json(types);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Başvuru tipleri alınamadı' });
  }
});

// ─── POST /api/submit-types ───────────────────────────────────────────────────
router.post('/', async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Yetkisiz' });

  const { name, key, icon, color, description } = req.body;
  if (!name?.trim() || !key?.trim())
    return res.status(400).json({ error: 'Ad ve anahtar zorunludur' });

  try {
    const type = await prisma.submitType.create({
      data: {
        name:        name.trim(),
        key:         key.trim().toUpperCase(),
        icon:        icon || null,
        color:       color || 'indigo',
        description: description?.trim() || null,
      },
    });
    res.status(201).json(type);
  } catch (err) {
    if (err.code === 'P2002')
      return res.status(409).json({ error: 'Bu ad veya anahtar zaten kullanılıyor' });
    logger.error(err);
    res.status(500).json({ error: 'Oluşturulamadı' });
  }
});

// ─── PATCH /api/submit-types/:id ─────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Yetkisiz' });

  const id = parseInt(req.params.id);
  const { name, icon, color, description, active, order } = req.body;
  const data = {};
  if (name        !== undefined) data.name        = name.trim();
  if (icon        !== undefined) data.icon        = icon;
  if (color       !== undefined) data.color       = color;
  if (description !== undefined) data.description = description?.trim() || null;
  if (active      !== undefined) data.active      = Boolean(active);
  if (order       !== undefined) data.order       = parseInt(order);

  try {
    const type = await prisma.submitType.update({ where: { id }, data });
    res.json(type);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Bulunamadı' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Bu ad zaten kullanılıyor' });
    logger.error(err);
    res.status(500).json({ error: 'Güncellenemedi' });
  }
});

// ─── DELETE /api/submit-types/:id ────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Yetkisiz' });

  const id = parseInt(req.params.id);
  try {
    // Bağlı kategori var mı?
    const count = await prisma.category.count({
      where: { type: (await prisma.submitType.findUnique({ where: { id }, select: { key: true } }))?.key || '' },
    });
    if (count > 0)
      return res.status(409).json({ error: `Bu tipe bağlı ${count} kategori var. Önce kategorileri taşıyın.` });

    await prisma.submitType.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Bulunamadı' });
    logger.error(err);
    res.status(500).json({ error: 'Silinemedi' });
  }
});

module.exports = router;
