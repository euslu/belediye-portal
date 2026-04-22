const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const logger = require('../utils/logger');
const { logIslem } = require('../middleware/auditLog');
const { getSistemRol, hasMinRole, canAccessTicket } = require('../middleware/rbac');
const { logActivity } = require('../lib/activity');
const { notifyTicketResolved } = require('../lib/notifications');

router.use(authMiddleware);

const INCLUDE = {
  createdBy:   { select: { id: true, displayName: true, username: true } },
  assignedTo:  { select: { id: true, displayName: true, username: true } },
  group:       { select: { id: true, name: true } },
  department:  { select: { id: true, name: true, shortCode: true } },
  ticket:      { select: { id: true, title: true, status: true } },
};

const ACCESS_INCLUDE = {
  createdBy:   { select: { id: true, username: true, displayName: true, directorate: true, department: true } },
  assignedTo:  { select: { id: true, username: true, displayName: true, directorate: true, department: true } },
  group:       { select: { id: true, name: true, department: true } },
  department:  { select: { id: true, name: true, shortCode: true } },
  ticket: {
    select: {
      id: true,
      title: true,
      status: true,
      targetDirectorate: true,
      targetDepartment: true,
      createdBy: { select: { username: true, directorate: true, department: true } },
      assignedTo: { select: { username: true, directorate: true, department: true } },
      group: { select: { name: true, department: true } },
    },
  },
};

async function getWorkOrderAccessContext(id) {
  return prisma.workOrder.findUnique({
    where: { id },
    include: ACCESS_INCLUDE,
  });
}

function canAccessWorkOrder(user, order) {
  const rol = getSistemRol(user);
  const username = user.username;

  if (rol === 'admin') return true;

  if (order.ticket && canAccessTicket(user, order.ticket)) return true;

  if (rol === 'daire_baskani') {
    if (!user.directorate) return false;
    return (
      order.createdBy?.directorate === user.directorate ||
      order.assignedTo?.directorate === user.directorate
    );
  }

  if (rol === 'mudur') {
    if (!user.department) return false;
    return (
      order.department?.name === user.department ||
      order.group?.department === user.department ||
      order.createdBy?.department === user.department ||
      order.assignedTo?.department === user.department
    );
  }

  if (rol === 'sef') {
    return (
      order.assignedTo?.username === username ||
      (user.office ? order.group?.name === user.office : false)
    );
  }

  return (
    order.createdBy?.username === username ||
    order.assignedTo?.username === username
  );
}

function buildWorkOrderQueryFilter(user) {
  const rol = getSistemRol(user);

  if (rol === 'admin') return {};

  if (rol === 'daire_baskani') {
    if (!user.directorate) return { id: -1 };
    return {
      OR: [
        { createdBy: { directorate: user.directorate } },
        { assignedTo: { directorate: user.directorate } },
        { ticket: { is: { OR: [
          { targetDirectorate: user.directorate },
          { createdBy: { directorate: user.directorate } },
          { assignedTo: { directorate: user.directorate } },
        ] } } },
      ],
    };
  }

  if (rol === 'mudur') {
    if (!user.department) return { id: -1 };
    return {
      OR: [
        { department: { name: user.department } },
        { group: { department: user.department } },
        { createdBy: { department: user.department } },
        { assignedTo: { department: user.department } },
        { ticket: { is: { OR: [
          { targetDepartment: user.department },
          { group: { department: user.department } },
          { createdBy: { department: user.department } },
          { assignedTo: { department: user.department } },
        ] } } },
      ],
    };
  }

  if (rol === 'sef') {
    return {
      OR: [
        { assignedTo: { username: user.username } },
        ...(user.office ? [{ group: { name: user.office } }] : []),
      ],
    };
  }

  return {
    OR: [
      { createdBy: { username: user.username } },
      { assignedTo: { username: user.username } },
    ],
  };
}

async function requireWorkOrderScopeAccess(id, user) {
  const order = await getWorkOrderAccessContext(id);
  if (!order) return { error: 'not_found' };
  if (!canAccessWorkOrder(user, order)) return { error: 'forbidden' };
  return { order };
}

function canUseDepartment(user, department) {
  const rol = getSistemRol(user);
  if (!department) return false;
  if (rol === 'admin') return true;
  if (rol === 'daire_baskani') return true;
  if (rol === 'mudur') return department.name === user.department;
  return false;
}

function canUseGroup(user, group) {
  const rol = getSistemRol(user);
  if (!group) return false;
  if (rol === 'admin') return true;
  if (rol === 'daire_baskani') return true;
  if (rol === 'mudur') return group.department === user.department;
  return false;
}

function canUseAssignee(user, assignee) {
  const rol = getSistemRol(user);
  if (!assignee) return false;
  if (rol === 'admin') return true;
  if (rol === 'daire_baskani') {
    if (!user.directorate) return false;
    return assignee.directorate === user.directorate;
  }
  if (rol === 'mudur') {
    if (!user.department) return false;
    return assignee.department === user.department;
  }
  return assignee.username === user.username;
}

async function validateWorkOrderTargets(user, { departmentId, groupId, assignedToId, ticketId }) {
  if (ticketId) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(ticketId) },
      include: {
        createdBy: { select: { username: true, directorate: true, department: true } },
        assignedTo: { select: { username: true, directorate: true, department: true } },
        group: { select: { name: true, department: true } },
      },
    });
    if (!ticket) return { error: 'ticket_not_found' };
    if (!canAccessTicket(user, ticket)) return { error: 'ticket_forbidden' };
  }

  if (departmentId) {
    const department = await prisma.department.findUnique({
      where: { id: parseInt(departmentId) },
      select: { id: true, name: true },
    });
    if (!department) return { error: 'department_not_found' };
    if (!canUseDepartment(user, department)) return { error: 'department_forbidden' };
  }

  if (groupId) {
    const group = await prisma.group.findUnique({
      where: { id: parseInt(groupId) },
      select: { id: true, name: true, department: true },
    });
    if (!group) return { error: 'group_not_found' };
    if (!canUseGroup(user, group)) return { error: 'group_forbidden' };
  }

  if (assignedToId) {
    const assignee = await prisma.user.findUnique({
      where: { id: parseInt(assignedToId) },
      select: { id: true, username: true, directorate: true, department: true },
    });
    if (!assignee) return { error: 'assignee_not_found' };
    if (!canUseAssignee(user, assignee)) return { error: 'assignee_forbidden' };
  }

  return { ok: true };
}

async function ensureActorUser(user) {
  return prisma.user.upsert({
    where: { username: user.username },
    update: { displayName: user.displayName },
    create: {
      username: user.username,
      displayName: user.displayName,
      role: user.role || 'user',
      department: user.department || null,
      directorate: user.directorate || null,
    },
  });
}

async function syncLinkedTicketAfterWorkOrderChange(workOrder, actorUser) {
  if (!workOrder?.ticketId) return;

  const [linkedTicket, activeSiblingCount] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id: workOrder.ticketId },
      include: {
        createdBy: { select: { id: true, displayName: true, email: true } },
        assignedTo: { select: { id: true, displayName: true, email: true } },
        group: { select: { id: true, name: true } },
        category: true,
      },
    }),
    prisma.workOrder.count({
      where: {
        ticketId: workOrder.ticketId,
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
    }),
  ]);

  if (!linkedTicket) return;
  if (linkedTicket.status === 'CLOSED' || linkedTicket.status === 'REJECTED') return;

  const hasActiveWorkOrders = activeSiblingCount > 0;

  if (hasActiveWorkOrders && linkedTicket.status === 'RESOLVED') {
    await prisma.ticket.update({
      where: { id: linkedTicket.id },
      data: {
        status: 'IN_PROGRESS',
        closedAt: null,
      },
    });

    await logActivity({
      ticketId: linkedTicket.id,
      userId: actorUser?.id || null,
      action: 'STATUS_CHANGED',
      fromValue: 'RESOLVED',
      toValue: 'IN_PROGRESS',
      description: `Bağlı iş emri yeniden aktif duruma geçtiği için ticket tekrar işleme alındı.`,
      comment: `İş emri: #${workOrder.id} ${workOrder.title}`,
    });

    return;
  }

  if (hasActiveWorkOrders) return;
  if (linkedTicket.status === 'RESOLVED') return;

  await prisma.ticket.update({
    where: { id: linkedTicket.id },
    data: {
      status: 'RESOLVED',
      closedAt: new Date(),
    },
  });

  await logActivity({
    ticketId: linkedTicket.id,
    userId: actorUser?.id || null,
    action: 'STATUS_CHANGED',
    fromValue: linkedTicket.status,
    toValue: 'RESOLVED',
    description: `İlgili iş emirleri tamamlandı. Ticket #${linkedTicket.id} otomatik olarak çözüldü durumuna alındı.`,
    comment: `Son tamamlanan iş emri: #${workOrder.id} ${workOrder.title}`,
  });

  notifyTicketResolved(linkedTicket, actorUser?.displayName || 'Sistem').catch(() => {});
}

// ─── GET /api/work-orders ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { status, priority, groupId, departmentId, assignedTo, myOrders, ticketId } = req.query;

  const extraFilters = {};
  const rbacFilter = buildWorkOrderQueryFilter(req.user);
  if (status)       extraFilters.status       = status;
  if (priority)     extraFilters.priority     = priority;
  if (groupId)      extraFilters.groupId      = parseInt(groupId);
  if (departmentId) extraFilters.departmentId = parseInt(departmentId);
  if (ticketId)     extraFilters.ticketId     = parseInt(ticketId);

  if (assignedTo === 'me' || myOrders === 'true') {
    const me = await prisma.user.findUnique({ where: { username: req.user.username }, select: { id: true } });
    if (me) extraFilters.assignedToId = me.id;
  }

  const where = Object.keys(rbacFilter).length
    ? { AND: [rbacFilter, extraFilters] }
    : extraFilters;

  try {
    const orders = await prisma.workOrder.findMany({
      where,
      include: INCLUDE,
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(orders);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'İş emirleri alınamadı' });
  }
});

// ─── GET /api/work-orders/:id ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const scope = await requireWorkOrderScopeAccess(parseInt(req.params.id), req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'İş emri bulunamadı' });
    if (scope.error === 'forbidden') return res.status(403).json({ error: 'Bu iş emrine erişim yetkiniz yok' });

    const wo = await prisma.workOrder.findUnique({
      where: { id: parseInt(req.params.id) },
      include: INCLUDE,
    });
    if (!wo) return res.status(404).json({ error: 'İş emri bulunamadı' });
    res.json(wo);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'İş emri alınamadı' });
  }
});

// ─── POST /api/work-orders ────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { title, description, priority, status, estimatedHours,
          dueDate, assignedToId, groupId, departmentId, ticketId } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: 'Başlık zorunludur' });

  try {
    if (!hasMinRole(req.user, 'mudur') && !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'İş emri oluşturma yetkiniz yok' });
    }

    const targetCheck = await validateWorkOrderTargets(req.user, { departmentId, groupId, assignedToId, ticketId });
    if (targetCheck.error === 'ticket_not_found') return res.status(404).json({ error: 'Bağlı ticket bulunamadı' });
    if (targetCheck.error === 'ticket_forbidden') return res.status(403).json({ error: 'Bu ticket için iş emri oluşturamazsınız' });
    if (targetCheck.error === 'department_not_found') return res.status(404).json({ error: 'Departman bulunamadı' });
    if (targetCheck.error === 'department_forbidden') return res.status(403).json({ error: 'Bu departman için iş emri oluşturamazsınız' });
    if (targetCheck.error === 'group_not_found') return res.status(404).json({ error: 'Grup bulunamadı' });
    if (targetCheck.error === 'group_forbidden') return res.status(403).json({ error: 'Bu gruba iş emri atayamazsınız' });
    if (targetCheck.error === 'assignee_not_found') return res.status(404).json({ error: 'Atanacak kullanıcı bulunamadı' });
    if (targetCheck.error === 'assignee_forbidden') return res.status(403).json({ error: 'Bu kullanıcıya iş emri atayamazsınız' });

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
    logIslem({ kullanici: req.user.username, kullaniciAd: req.user.displayName, islem: 'CREATE', modul: 'work-order', kayitId: wo.id, detay: { title: title.trim(), priority: priority || 'MEDIUM' }, ip: req.ip });
    res.status(201).json(wo);
  } catch (err) {
    logger.error(err);
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
    const scope = await requireWorkOrderScopeAccess(id, req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'İş emri bulunamadı' });
    if (scope.error === 'forbidden') return res.status(403).json({ error: 'Bu iş emri üzerinde işlem yetkiniz yok' });

    const targetCheck = await validateWorkOrderTargets(req.user, { departmentId, groupId, assignedToId, ticketId });
    if (targetCheck.error === 'ticket_not_found') return res.status(404).json({ error: 'Bağlı ticket bulunamadı' });
    if (targetCheck.error === 'ticket_forbidden') return res.status(403).json({ error: 'Bu ticket ile ilişkilendirme yetkiniz yok' });
    if (targetCheck.error === 'department_not_found') return res.status(404).json({ error: 'Departman bulunamadı' });
    if (targetCheck.error === 'department_forbidden') return res.status(403).json({ error: 'Bu departmana taşıma yetkiniz yok' });
    if (targetCheck.error === 'group_not_found') return res.status(404).json({ error: 'Grup bulunamadı' });
    if (targetCheck.error === 'group_forbidden') return res.status(403).json({ error: 'Bu gruba atama yetkiniz yok' });
    if (targetCheck.error === 'assignee_not_found') return res.status(404).json({ error: 'Atanacak kullanıcı bulunamadı' });
    if (targetCheck.error === 'assignee_forbidden') return res.status(403).json({ error: 'Bu kullanıcıya atama yetkiniz yok' });

    const actorUser = await ensureActorUser(req.user);

    const wo = await prisma.workOrder.update({ where: { id }, data, include: INCLUDE });

    if (status === 'DONE') {
      await syncLinkedTicketAfterWorkOrderChange(wo, actorUser);
    }

    logIslem({ kullanici: req.user.username, kullaniciAd: req.user.displayName, islem: 'UPDATE', modul: 'work-order', kayitId: id, detay: Object.keys(data), ip: req.ip });
    res.json(wo);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'İş emri bulunamadı' });
    logger.error(err);
    res.status(500).json({ error: 'İş emri güncellenemedi' });
  }
});

// ─── DELETE /api/work-orders/:id ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const scope = await requireWorkOrderScopeAccess(id, req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'İş emri bulunamadı' });

    const isAdmin = getSistemRol(req.user) === 'admin';
    const isOwner = scope.order.createdBy?.username === req.user.username;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Bu iş emrini silme yetkiniz yok' });
    }

    await prisma.workOrder.delete({ where: { id } });
    logIslem({ kullanici: req.user.username, kullaniciAd: req.user.displayName, islem: 'DELETE', modul: 'work-order', kayitId: id, ip: req.ip });
    res.json({ message: 'İş emri silindi' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'İş emri bulunamadı' });
    logger.error(err);
    res.status(500).json({ error: 'İş emri silinemedi' });
  }
});

module.exports = router;
