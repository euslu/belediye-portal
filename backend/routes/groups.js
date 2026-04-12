const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const { logActivity } = require('../lib/activity');
const { notifyTicketAssigned } = require('../lib/notifications');
const logger = require('../utils/logger');

router.use(authMiddleware);

// Grup yönetimi yetkisi: sadece admin ve manager
function canManageGroups(reqUser) {
  return ['admin', 'manager'].includes(reqUser.role);
}

// ─── GET /api/groups ──────────────────────────────────────────────────────────
// Tüm gruplar + üye sayısı + açık ticket sayısı
router.get('/', async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      include: {
        _count: { select: { members: true, tickets: true } },
        members: {
          where:   { role: 'leader' },
          include: { user: { select: { id: true, displayName: true } } },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(groups);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Gruplar alınamadı' });
  }
});

// ─── GET /api/groups/:id/members ─────────────────────────────────────────────
// Belirli bir grubun üyeleri
router.get('/:id/members', async (req, res) => {
  const groupId = parseInt(req.params.id);
  try {
    const members = await prisma.userGroup.findMany({
      where: {
        groupId,
        user: { department: { not: 'Dış Kullanıcı' } },
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, email: true, title: true, department: true },
        },
      },
    });
    res.json(members.map((m) => ({ ...m.user, groupRole: m.role })));
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Üyeler alınamadı' });
  }
});

// ─── POST /api/groups ─────────────────────────────────────────────────────────
// Yeni grup oluştur (admin/manager/şube müdürü)
router.post('/', async (req, res) => {
  if (!canManageGroups(req.user))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const { name, description, memberIds = [] } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Grup adı zorunlu' });

  try {
    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        members: {
          create: memberIds.map((uid) => ({ userId: parseInt(uid), role: 'member' })),
        },
      },
      include: { _count: { select: { members: true, tickets: true } } },
    });
    res.status(201).json(group);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Bu isimde bir grup zaten var' });
    logger.error(err);
    res.status(500).json({ error: 'Grup oluşturulamadı' });
  }
});

// ─── PUT /api/groups/:id ──────────────────────────────────────────────────────
// Grubu güncelle (admin/manager/şube müdürü)
router.put('/:id', async (req, res) => {
  if (!canManageGroups(req.user))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const groupId = parseInt(req.params.id);
  const { name, description, email, department } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Grup adı zorunlu' });

  try {
    const data = { name: name.trim(), description: description?.trim() || null };
    if (email      !== undefined) data.email      = email?.trim()      || null;
    if (department !== undefined) data.department = department?.trim() || null;
    const group = await prisma.group.update({
      where: { id: groupId },
      data,
      include: { _count: { select: { members: true, tickets: true } } },
    });
    res.json(group);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Grup bulunamadı' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Bu isimde bir grup zaten var' });
    logger.error(err);
    res.status(500).json({ error: 'Grup güncellenemedi' });
  }
});

// ─── PATCH /api/groups/:id ────────────────────────────────────────────────────
// Kısmi güncelleme (Settings sayfasından kullanılır)
router.patch('/:id', async (req, res) => {
  if (!canManageGroups(req.user))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const groupId = parseInt(req.params.id);
  const { name, description, email, department } = req.body;
  const data = {};
  if (name        !== undefined) data.name        = name.trim();
  if (description !== undefined) data.description = description?.trim() || null;
  if (email       !== undefined) data.email       = email?.trim()       || null;
  if (department  !== undefined) data.department  = department?.trim()  || null;

  try {
    const group = await prisma.group.update({
      where: { id: groupId },
      data,
      include: { _count: { select: { members: true, tickets: true } } },
    });
    res.json(group);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Grup bulunamadı' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Bu isimde bir grup zaten var' });
    logger.error(err);
    res.status(500).json({ error: 'Grup güncellenemedi' });
  }
});

// ─── DELETE /api/groups/:id ───────────────────────────────────────────────────
// Grubu sil (admin)
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Sadece adminler silebilir' });

  const groupId = parseInt(req.params.id);
  try {
    await prisma.userGroup.deleteMany({ where: { groupId } });
    await prisma.group.delete({ where: { id: groupId } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Grup bulunamadı' });
    logger.error(err);
    res.status(500).json({ error: 'Grup silinemedi' });
  }
});

// ─── PATCH /api/groups/:id/leader ────────────────────────────────────────────
// Grup liderini ata: sadece seçilen üyeyi 'leader' yap, diğerlerini 'member'e indir
router.patch('/:id/leader', async (req, res) => {
  if (!canManageGroups(req.user))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const groupId  = parseInt(req.params.id);
  const leaderId = parseInt(req.body.leaderId);

  if (!leaderId || isNaN(leaderId))
    return res.status(400).json({ error: 'leaderId zorunludur' });

  try {
    // Kullanıcı bu grubun üyesi mi?
    const membership = await prisma.userGroup.findUnique({
      where: { userId_groupId: { userId: leaderId, groupId } },
    });
    if (!membership)
      return res.status(404).json({ error: 'Bu kullanıcı grubun üyesi değil' });

    // Tüm üyeleri 'member' yap, sonra seçileni 'leader' yap (transaction)
    await prisma.$transaction([
      prisma.userGroup.updateMany({ where: { groupId }, data: { role: 'member' } }),
      prisma.userGroup.update({
        where: { userId_groupId: { userId: leaderId, groupId } },
        data:  { role: 'leader' },
      }),
    ]);

    const leader = await prisma.user.findUnique({
      where:  { id: leaderId },
      select: { id: true, displayName: true, username: true },
    });

    logger.info(`[Grup] Group #${groupId} → lider: ${leader?.displayName}`);
    res.json({ ok: true, leader });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Lider atanamadı' });
  }
});

// ─── POST /api/groups/:id/members ────────────────────────────────────────────
// Gruba üye ekle (admin/manager/şube müdürü)
router.post('/:id/members', async (req, res) => {
  if (!canManageGroups(req.user))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const groupId = parseInt(req.params.id);
  const { userIds = [], role = 'member' } = req.body;

  try {
    await prisma.$transaction(
      userIds.map((uid) =>
        prisma.userGroup.upsert({
          where:  { userId_groupId: { userId: parseInt(uid), groupId } },
          update: { role },
          create: { userId: parseInt(uid), groupId, role },
        })
      )
    );
    const members = await prisma.userGroup.findMany({
      where:   { groupId },
      include: { user: { select: { id: true, username: true, displayName: true, email: true, title: true, department: true } } },
    });
    res.json(members.map((m) => ({ ...m.user, groupRole: m.role })));
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Üye eklenemedi' });
  }
});

// ─── DELETE /api/groups/:id/members/:userId ───────────────────────────────────
// Gruptan üye çıkar (admin/manager/şube müdürü)
router.delete('/:id/members/:userId', async (req, res) => {
  if (!canManageGroups(req.user))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const groupId = parseInt(req.params.id);
  const userId  = parseInt(req.params.userId);
  try {
    await prisma.userGroup.delete({ where: { userId_groupId: { userId, groupId } } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Üye bulunamadı' });
    logger.error(err);
    res.status(500).json({ error: 'Üye çıkarılamadı' });
  }
});

// ─── POST /api/tickets/:id/assign ────────────────────────────────────────────
// Ticket'ı gruba veya kişiye ata (sadece admin ve manager)
router.post('/tickets/:id/assign', async (req, res) => {
  const ticketId  = parseInt(req.params.id);
  const { groupId, assignedToId } = req.body;

  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  }

  try {
    const actorUser = await prisma.user.upsert({
      where:  { username: req.user.username },
      update: {},
      create: {
        username:    req.user.username,
        displayName: req.user.displayName,
        role:        req.user.role || 'user',
      },
    });

    // Atama öncesi eski grup/kişi adlarını çek (description için)
    const existing = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        group:      { select: { id: true, name: true } },
        assignedTo: { select: { id: true, displayName: true } },
      },
    });
    if (!existing) return res.status(404).json({ error: 'Ticket bulunamadı' });

    const data = {};

    if (groupId !== undefined) {
      data.groupId = groupId ? parseInt(groupId) : null;
      if (existing.status === 'OPEN' && groupId) {
        data.status = 'ASSIGNED';
      }
    }

    if (assignedToId !== undefined) {
      data.assignedToId = assignedToId ? parseInt(assignedToId) : null;
      if (assignedToId) data.status = 'IN_PROGRESS';
    }

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data,
      include: {
        group:      true,
        assignedTo: { select: { id: true, displayName: true, username: true } },
        createdBy:  { select: { id: true, displayName: true } },
      },
    });

    // Aktivite kayıtları — grup değişimi
    const newGroupId = groupId !== undefined ? (groupId ? parseInt(groupId) : null) : existing.groupId;
    if (groupId !== undefined && newGroupId !== existing.groupId) {
      const oldGroupName = existing.group?.name || null;
      const newGroupName = ticket.group?.name    || null;
      const isChange     = !!existing.groupId;
      let desc;
      if (isChange) {
        desc = `Ticket #${ticketId} → ${actorUser.displayName} tarafından grup '${oldGroupName}' → '${newGroupName}' olarak değiştirildi`;
      } else {
        desc = `Ticket #${ticketId} → ${actorUser.displayName} tarafından ${newGroupName} grubuna atandı`;
      }
      await logActivity({
        ticketId, userId: actorUser.id,
        action:      isChange ? 'GROUP_CHANGED' : 'ASSIGNED',
        fromValue:   String(existing.groupId || ''),
        toValue:     String(newGroupId || ''),
        description: desc,
      });
    }

    // Aktivite kayıtları — kişi değişimi
    if (assignedToId !== undefined) {
      const hadAssignee = existing.assignedToId;
      const newAssignee = assignedToId ? parseInt(assignedToId) : null;
      if (newAssignee !== existing.assignedToId) {
        const oldName     = existing.assignedTo?.displayName || null;
        const newName     = ticket.assignedTo?.displayName   || null;
        const groupName   = ticket.group?.name || null;
        const isReassign  = !!hadAssignee;
        let desc;
        if (isReassign) {
          desc = `Ticket #${ticketId} → ${actorUser.displayName} tarafından ${newName}'e yeniden atandı (önceki: ${oldName})`;
        } else {
          desc = `Ticket #${ticketId} → ${actorUser.displayName} tarafından ${newName}'e atandı${groupName ? ` (${groupName})` : ''}`;
        }
        await logActivity({
          ticketId, userId: actorUser.id,
          action:      isReassign ? 'REASSIGNED' : 'ASSIGNED',
          fromValue:   hadAssignee ? String(hadAssignee) : null,
          toValue:     newAssignee ? String(newAssignee) : null,
          description: desc,
        });
      }
    }

    // E-posta bildirimi: atanan kişiye
    if (assignedToId && ticket.assignedTo) {
      const isReassign = !!existing.assignedToId && existing.assignedToId !== parseInt(assignedToId);
      notifyTicketAssigned(ticket, actorUser.displayName, isReassign).catch(() => {});
    }

    // Bildirim kuyruğuna ekle
    await prisma.notificationQueue.create({
      data: {
        type:     'TICKET_ASSIGNED',
        ticketId: ticket.id,
        payload: {
          ticketId:    ticket.id,
          title:       ticket.title,
          groupId:     ticket.groupId,
          groupName:   ticket.group?.name,
          assignedTo:  ticket.assignedTo?.displayName,
          assignedBy:  req.user.displayName,
        },
      },
    });

    res.json(ticket);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Ticket bulunamadı' });
    logger.error(err);
    res.status(500).json({ error: 'Atama yapılamadı' });
  }
});

module.exports = router;
