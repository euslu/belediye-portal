const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

router.use(authMiddleware);

// ─── GET /api/subjects?categoryId=X ──────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const where = { active: true };
    if (req.query.categoryId) where.categoryId = parseInt(req.query.categoryId);
    if (req.query.all === 'true') delete where.active;

    const subjects = await prisma.subject.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { defaultGroup: { select: { id: true, name: true } } },
    });
    res.json(subjects);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Konular alınamadı' });
  }
});

// ─── POST /api/subjects ───────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
  const { name, categoryId, defaultGroupId, slaHours, slaWarningHours } = req.body;
  if (!name?.trim() || !categoryId) return res.status(400).json({ error: 'Ad ve kategori zorunludur' });
  try {
    const subject = await prisma.subject.create({
      data: {
        name:            name.trim(),
        categoryId:      parseInt(categoryId),
        defaultGroupId:  defaultGroupId  ? parseInt(defaultGroupId)  : null,
        slaHours:        slaHours != null ? parseInt(slaHours)       : null,
        slaWarningHours: slaWarningHours != null ? parseInt(slaWarningHours) : null,
      },
      include: { defaultGroup: { select: { id: true, name: true } } },
    });
    res.status(201).json(subject);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Konu oluşturulamadı' });
  }
});

// ─── PATCH /api/subjects/:id ──────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
  const id = parseInt(req.params.id);
  const { name, categoryId, defaultGroupId, active, slaHours, slaWarningHours } = req.body;
  const data = {};
  if (name            !== undefined) data.name            = name.trim();
  if (categoryId      !== undefined) data.categoryId      = parseInt(categoryId);
  if (defaultGroupId  !== undefined) data.defaultGroupId  = defaultGroupId ? parseInt(defaultGroupId) : null;
  if (active          !== undefined) data.active          = Boolean(active);
  if (slaHours        !== undefined) data.slaHours        = slaHours != null ? parseInt(slaHours)       : null;
  if (slaWarningHours !== undefined) data.slaWarningHours = slaWarningHours != null ? parseInt(slaWarningHours) : null;
  try {
    const subject = await prisma.subject.update({
      where: { id },
      data,
      include: { defaultGroup: { select: { id: true, name: true } } },
    });
    res.json(subject);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Konu bulunamadı' });
    logger.error(err);
    res.status(500).json({ error: 'Konu güncellenemedi' });
  }
});

// ─── DELETE /api/subjects/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
  const id = parseInt(req.params.id);
  try {
    const count = await prisma.ticket.count({ where: { subjectId: id } });
    if (count > 0) return res.status(409).json({ error: `Bu konuya bağlı ${count} ticket var` });
    await prisma.subject.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Konu bulunamadı' });
    logger.error(err);
    res.status(500).json({ error: 'Konu silinemedi' });
  }
});

module.exports = router;
