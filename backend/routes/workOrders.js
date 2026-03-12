const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

const INCLUDE = {
  createdBy:   { select: { id: true, displayName: true, username: true } },
  assignedTo:  { select: { id: true, displayName: true, username: true } },
  group:       { select: { id: true, name: true } },
  department:  { select: { id: true, name: true, shortCode: true } },
  ticket:      { select: { id: true, title: true, status: true } },
};

// ─── GET /api/work-orders ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { status, priority, groupId, departmentId, assignedTo, myOrders } = req.query;

  const where = {};
  if (status)       where.status       = status;
  if (priority)     where.priority     = priority;
  if (groupId)      where.groupId      = parseInt(groupId);
  if (departmentId) where.departmentId = parseInt(departmentId);

  if (assignedTo === 'me' || myOrders === 'true') {
    const me = await prisma.user.findUnique({ where: { username: req.user.username }, select: { id: true } });
    if (me) where.assignedToId = me.id;
  }

  try {
    const orders = await prisma.workOrder.findMany({
      where,
      include: INCLUDE,
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'İş emirleri alınamadı' });
  }
});

// ─── GET /api/work-orders/:id ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const wo = await prisma.workOrder.findUnique({
      where: { id: parseInt(req.params.id) },
      include: INCLUDE,
    });
    if (!wo) return res.status(404).json({ error: 'İş emri bulunamadı' });
    res.json(wo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'İş emri alınamadı' });
  }
});

// ─── POST /api/work-orders ────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { title, description, priority, status, estimatedHours,
          dueDate, assignedToId, groupId, departmentId, ticketId } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: 'Başlık zorunludur' });

  try {
    const me = await prisma.user.upsert({
      where:  { username: req.user.username },
      update: { displayName: req.user.displayName },
      create: { username: req.user.username, displayName: req.user.displayName, role: req.user.role || 'user' },
    });

    const wo = await prisma.workOrder.create({
      data: {
        title:          title.trim(),
        description:    description?.trim() || null,
        priority:       priority       || 'MEDIUM',
        status:         status         || 'TODO',
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        dueDate:        dueDate        ? new Date(dueDate)          : null,
        assignedToId:   assignedToId   ? parseInt(assignedToId)     : null,
        groupId:        groupId        ? parseInt(groupId)          : null,
        departmentId:   departmentId   ? parseInt(departmentId)     : null,
        ticketId:       ticketId       ? parseInt(ticketId)         : null,
        createdById:    me.id,
      },
      include: INCLUDE,
    });
    res.status(201).json(wo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'İş emri oluşturulamadı' });
  }
});

// ─── PATCH /api/work-orders/:id ───────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, description, priority, status, estimatedHours,
          dueDate, assignedToId, groupId, departmentId, ticketId } = req.body;

  const data = {};
  if (title         !== undefined) data.title          = title.trim();
  if (description   !== undefined) data.description    = description?.trim() || null;
  if (priority      !== undefined) data.priority       = priority;
  if (status        !== undefined) {
    data.status = status;
    if (status === 'DONE') data.completedAt = new Date();
    else                   data.completedAt = null;
  }
  if (estimatedHours !== undefined) data.estimatedHours = estimatedHours ? parseFloat(estimatedHours) : null;
  if (dueDate        !== undefined) data.dueDate        = dueDate ? new Date(dueDate) : null;
  if (assignedToId   !== undefined) data.assignedToId   = assignedToId   ? parseInt(assignedToId)   : null;
  if (groupId        !== undefined) data.groupId        = groupId        ? parseInt(groupId)        : null;
  if (departmentId   !== undefined) data.departmentId   = departmentId   ? parseInt(departmentId)   : null;
  if (ticketId       !== undefined) data.ticketId       = ticketId       ? parseInt(ticketId)       : null;

  try {
    const wo = await prisma.workOrder.update({ where: { id }, data, include: INCLUDE });
    res.json(wo);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'İş emri bulunamadı' });
    console.error(err);
    res.status(500).json({ error: 'İş emri güncellenemedi' });
  }
});

// ─── DELETE /api/work-orders/:id ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.workOrder.delete({ where: { id } });
    res.json({ message: 'İş emri silindi' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'İş emri bulunamadı' });
    console.error(err);
    res.status(500).json({ error: 'İş emri silinemedi' });
  }
});

module.exports = router;
