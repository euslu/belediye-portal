const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const { logActivity } = require('../lib/activity');
const { notifyTicketCreated, notifyTicketAssigned, notifyTicketResolved } = require('../lib/notifications');
const upload  = require('../lib/upload');

router.use(authMiddleware);

const STATUS_TR   = { OPEN: 'Açık', PENDING_APPROVAL: 'Onay Bekliyor', ASSIGNED: 'Atandı', IN_PROGRESS: 'İşlemde', RESOLVED: 'Çözüldü', CLOSED: 'Kapalı', REJECTED: 'Reddedildi' };
const PRIORITY_TR = { LOW: 'Düşük', MEDIUM: 'Orta', HIGH: 'Yüksek', CRITICAL: 'Kritik' };

// ─── GET /api/categories ──────────────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kategoriler alınamadı' });
  }
});

// ─── GET /api/tickets ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { status, priority, categoryId, createdBy, assignedTo, directorate, limit, source } = req.query;

  const where = {};
  if (status)     where.status     = status;
  if (priority)   where.priority   = priority;
  if (source)     where.source     = source;
  if (categoryId) where.categoryId = parseInt(categoryId);
  if (directorate) where.createdBy = { directorate };

  if (createdBy === 'me' || assignedTo === 'me') {
    const me = await prisma.user.findUnique({ where: { username: req.user.username }, select: { id: true } });
    if (me) {
      if (createdBy  === 'me') where.createdById  = me.id;
      if (assignedTo === 'me') where.assignedToId = me.id;
    }
  }

  try {
    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        createdBy:  { select: { id: true, displayName: true, username: true, directorate: true, department: true, office: true, city: true } },
        assignedTo: { select: { id: true, displayName: true, username: true } },
        category:   { select: { id: true, name: true, icon: true } },
        subject:    { select: { id: true, name: true } },
        _count:     { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: parseInt(limit) } : {}),
    });
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ticketlar alınamadı' });
  }
});

// ─── GET /api/tickets/pending-approval ───────────────────────────────────────
// Manager: kendi müdürlüğündeki onay bekleyen talepler; Admin: hepsi
router.get('/pending-approval', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  try {
    const where = { status: 'PENDING_APPROVAL' };

    // Manager ise yalnızca kendi müdürlüğündeki kullanıcıların taleplerini görsün
    if (req.user.role === 'manager' && req.user.directorate) {
      where.createdBy = { directorate: req.user.directorate };
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        createdBy: { select: { id: true, displayName: true, username: true, directorate: true, department: true } },
        category:  { select: { id: true, name: true, icon: true } },
        subject:   { select: { id: true, name: true } },
        group:     { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Onay bekleyen talepler alınamadı' });
  }
});

// ─── GET /api/tickets/pending-approval/count ─────────────────────────────────
router.get('/pending-approval/count', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.json({ count: 0 });

  try {
    const where = { status: 'PENDING_APPROVAL' };
    if (req.user.role === 'manager' && req.user.directorate) {
      where.createdBy = { directorate: req.user.directorate };
    }
    const count = await prisma.ticket.count({ where });
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.json({ count: 0 });
  }
});

// ─── GET /api/tickets/attachments/:attachmentId/download ─────────────────────
// (/attachments/... önce tanımlanmalı; aksi hâlde /:id yakalar)
// Token hem Authorization header'ından hem de ?token= query param'ından kabul edilir
router.get('/attachments/:attachmentId/download', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const rawToken = req.query.token
    || (req.headers['authorization'] || '').split(' ')[1];

  if (!rawToken) return res.status(401).json({ error: 'Token gerekli' });
  try {
    jwt.verify(rawToken, process.env.JWT_SECRET);
  } catch {
    return res.status(403).json({ error: 'Geçersiz token' });
  }

  const attachmentId = parseInt(req.params.attachmentId);
  try {
    const att = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!att) return res.status(404).json({ error: 'Dosya bulunamadı' });

    const filePath = path.join(__dirname, '../uploads/tickets', String(att.ticketId), att.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Dosya diskte bulunamadı' });

    res.download(filePath, att.originalName);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Dosya indirilemedi' });
  }
});

// ─── GET /api/tickets/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        createdBy:  { select: { id: true, displayName: true, username: true, directorate: true, department: true, office: true, city: true } },
        assignedTo: { select: { id: true, displayName: true, username: true } },
        group:      { select: { id: true, name: true } },
        category:   true,
        subject:    { include: { category: { select: { id: true, name: true, icon: true } }, defaultGroup: { select: { id: true, name: true } } } },
        comments:   { orderBy: { createdAt: 'asc' } },
        activities: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, displayName: true, username: true } },
          },
        },
      },
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket bulunamadı' });
    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ticket alınamadı' });
  }
});

// ─── POST /api/tickets ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { title, description, priority, type, categoryId, subjectId, dueDate, source } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Başlık ve açıklama zorunludur' });
  }

  try {
    const user = await prisma.user.upsert({
      where:  { username: req.user.username },
      update: {
        displayName: req.user.displayName,
        role:        req.user.role,
        office:      req.user.office || null,
        city:        req.user.city   || null,
      },
      create: {
        username:    req.user.username,
        displayName: req.user.displayName,
        email:       req.user.email      || null,
        department:  req.user.department || null,
        title:       req.user.title      || null,
        office:      req.user.office     || null,
        city:        req.user.city       || null,
        role:        req.user.role       || 'user',
      },
    });

    // Konu (Subject) seçildiyse otomatik grup belirle
    let autoGroupId   = null;
    let autoGroupName = null;
    if (subjectId) {
      const subj = await prisma.subject.findUnique({
        where:  { id: parseInt(subjectId) },
        select: { defaultGroupId: true, defaultGroup: { select: { name: true } } },
      });
      if (subj?.defaultGroupId) {
        autoGroupId   = subj.defaultGroupId;
        autoGroupName = subj.defaultGroup?.name || null;
      }
    }

    // REQUEST tipi talepler yönetici onayına gider; INCIDENT doğrudan atanır
    const resolvedType = type || 'INCIDENT';
    let initialStatus;
    if (resolvedType === 'REQUEST') {
      initialStatus = 'PENDING_APPROVAL';
    } else {
      initialStatus = autoGroupId ? 'ASSIGNED' : 'OPEN';
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        priority:      priority   || 'MEDIUM',
        type:          resolvedType,
        dueDate:       dueDate    ? new Date(dueDate) : null,
        categoryId:    categoryId ? parseInt(categoryId) : null,
        subjectId:     subjectId  ? parseInt(subjectId)  : null,
        groupId:       resolvedType === 'REQUEST' ? null : autoGroupId,
        status:        initialStatus,
        approvalStatus: resolvedType === 'REQUEST' ? 'PENDING_APPROVAL' : null,
        source:        source || 'PORTAL',
        createdById:   user.id,
      },
      include: {
        createdBy: { select: { id: true, displayName: true } },
        category:  true,
        subject:   { include: { defaultGroup: { select: { id: true, name: true } } } },
        group:     { select: { id: true, name: true } },
      },
    });

    await logActivity({
      ticketId:    ticket.id,
      userId:      user.id,
      action:      'CREATED',
      description: `Ticket #${ticket.id} → ${user.displayName} tarafından oluşturuldu`,
    });

    if (resolvedType === 'REQUEST') {
      await logActivity({
        ticketId:    ticket.id,
        userId:      user.id,
        action:      'STATUS_CHANGED',
        toValue:     'PENDING_APPROVAL',
        description: `Hizmet talebi → yönetici onayına gönderildi`,
      });
    } else if (autoGroupName) {
      await logActivity({
        ticketId:    ticket.id,
        userId:      user.id,
        action:      'ASSIGNED',
        description: `Kategori seçimine göre "${autoGroupName}" grubuna otomatik atandı`,
      });
      console.log(`[Yönlendirme] Ticket #${ticket.id} → ${autoGroupName} grubuna atandı`);
    }

    // Bildirim: açana onay + grubun mail adresine
    notifyTicketCreated(
      { ...ticket, createdBy: { ...ticket.createdBy, email: user.email } },
      autoGroupName
    ).catch(() => {});

    res.status(201).json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ticket oluşturulamadı' });
  }
});

// ─── PATCH /api/tickets/:id ───────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, description, status, priority, categoryId, assignedToId } = req.body;

  try {
    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Ticket bulunamadı' });

    const actorUser = await prisma.user.upsert({
      where:  { username: req.user.username },
      update: {},
      create: {
        username:    req.user.username,
        displayName: req.user.displayName,
        role:        req.user.role || 'user',
      },
    });

    const data = {};
    if (title        !== undefined) data.title        = title;
    if (description  !== undefined) data.description  = description;
    if (status       !== undefined) data.status       = status;
    if (priority     !== undefined) data.priority     = priority;
    if (categoryId   !== undefined) data.categoryId   = categoryId ? parseInt(categoryId) : null;
    if (assignedToId !== undefined) data.assignedToId = assignedToId ? parseInt(assignedToId) : null;

    if (status === 'CLOSED' || status === 'RESOLVED') {
      data.closedAt = new Date();
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data,
      include: {
        createdBy:  { select: { id: true, displayName: true } },
        assignedTo: { select: { id: true, displayName: true, email: true } },
        category:   true,
        group:      { select: { id: true, name: true } },
      },
    });

    if (assignedToId !== undefined && assignedToId !== existing.assignedToId && ticket.assignedTo) {
      const isReassign = existing.assignedToId !== null;
      notifyTicketAssigned(ticket, actorUser.displayName, isReassign).catch(() => {});

      await logActivity({
        ticketId:    id,
        userId:      actorUser.id,
        action:      'ASSIGNED',
        description: `Ticket #${id} → ${actorUser.displayName} tarafından ${ticket.assignedTo.displayName} kişisine ${isReassign ? 'yeniden ' : ''}atandı`,
      });
    }

    if (status !== undefined && status !== existing.status) {
      const fromLabel = STATUS_TR[existing.status] || existing.status;
      const toLabel   = STATUS_TR[status] || status;
      await logActivity({
        ticketId:    id,
        userId:      actorUser.id,
        action:      'STATUS_CHANGED',
        fromValue:   existing.status,
        toValue:     status,
        description: `Ticket #${id} → ${actorUser.displayName} tarafından durum '${fromLabel}' → '${toLabel}' olarak güncellendi`,
      });

      // Bildirim: RESOLVED → talebi açana e-posta
      if (status === 'RESOLVED') {
        const full = await prisma.ticket.findUnique({
          where: { id },
          include: { createdBy: true },
        });
        if (full) {
          notifyTicketResolved(full, actorUser.displayName).catch(() => {});
        }
      }
    }

    if (priority !== undefined && priority !== existing.priority) {
      const fromLabel = PRIORITY_TR[existing.priority] || existing.priority;
      const toLabel   = PRIORITY_TR[priority] || priority;
      await logActivity({
        ticketId:    id,
        userId:      actorUser.id,
        action:      'PRIORITY_CHANGED',
        fromValue:   existing.priority,
        toValue:     priority,
        description: `Ticket #${id} → ${actorUser.displayName} tarafından öncelik '${fromLabel}' → '${toLabel}' olarak güncellendi`,
      });
    }

    res.json(ticket);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Ticket bulunamadı' });
    console.error(err);
    res.status(500).json({ error: 'Ticket güncellenemedi' });
  }
});

// ─── POST /api/tickets/:id/approve ────────────────────────────────────────────
router.post('/:id/approve', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { subject: { select: { defaultGroupId: true, defaultGroup: { select: { name: true } } } } },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (ticket.status !== 'PENDING_APPROVAL')
      return res.status(400).json({ error: 'Bu talep onay bekliyor durumunda değil' });

    const actor = await prisma.user.upsert({
      where:  { username: req.user.username },
      update: {},
      create: { username: req.user.username, displayName: req.user.displayName, role: req.user.role },
    });

    // Onaylandıktan sonra gruba yönlendir (subject'ten veya mevcut groupId'den)
    const targetGroupId   = ticket.groupId || ticket.subject?.defaultGroupId || null;
    const targetGroupName = ticket.subject?.defaultGroup?.name || null;

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        status:         targetGroupId ? 'ASSIGNED' : 'OPEN',
        approvalStatus: 'APPROVED',
        approvedBy:     req.user.username,
        approvedAt:     new Date(),
        groupId:        targetGroupId,
      },
      include: {
        createdBy:  { select: { id: true, displayName: true, username: true } },
        group:      { select: { id: true, name: true } },
      },
    });

    await logActivity({
      ticketId:    id,
      userId:      actor.id,
      action:      'APPROVED',
      fromValue:   'PENDING_APPROVAL',
      toValue:     updated.status,
      description: `Talep ${actor.displayName} tarafından onaylandı${targetGroupName ? ` ve "${targetGroupName}" grubuna yönlendirildi` : ''}`,
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Talep onaylanamadı' });
  }
});

// ─── POST /api/tickets/:id/reject ─────────────────────────────────────────────
router.post('/:id/reject', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  const { reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ error: 'Red gerekçesi zorunludur' });

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (ticket.status !== 'PENDING_APPROVAL')
      return res.status(400).json({ error: 'Bu talep onay bekliyor durumunda değil' });

    const actor = await prisma.user.upsert({
      where:  { username: req.user.username },
      update: {},
      create: { username: req.user.username, displayName: req.user.displayName, role: req.user.role },
    });

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        status:         'REJECTED',
        approvalStatus: 'REJECTED',
        approvedBy:     req.user.username,
        approvedAt:     new Date(),
        rejectedReason: reason.trim(),
        closedAt:       new Date(),
      },
      include: {
        createdBy: { select: { id: true, displayName: true, username: true } },
      },
    });

    await logActivity({
      ticketId:    id,
      userId:      actor.id,
      action:      'REJECTED',
      fromValue:   'PENDING_APPROVAL',
      toValue:     'REJECTED',
      description: `Talep ${actor.displayName} tarafından reddedildi: "${reason.trim()}"`,
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Talep reddedilemedi' });
  }
});

// ─── POST /api/tickets/:id/transfer ──────────────────────────────────────────
router.post('/:id/transfer', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  const { targetDeptId, targetGroupId, note } = req.body;
  if (!targetDeptId) return res.status(400).json({ error: 'Hedef daire zorunludur' });

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { department: true, group: true },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket bulunamadı' });

    const actor = await prisma.user.upsert({
      where:  { username: req.user.username },
      update: {},
      create: { username: req.user.username, displayName: req.user.displayName, role: req.user.role },
    });

    const targetDept = await prisma.department.findUnique({ where: { id: parseInt(targetDeptId) } });
    if (!targetDept) return res.status(404).json({ error: 'Hedef daire bulunamadı' });

    // Transfer log yaz
    if (ticket.departmentId) {
      await prisma.ticketTransferLog.create({
        data: {
          ticketId:   id,
          fromDeptId: ticket.departmentId,
          toDeptId:   parseInt(targetDeptId),
          fromGroupId: ticket.groupId  || null,
          toGroupId:   targetGroupId   ? parseInt(targetGroupId) : null,
          note:        note?.trim()    || null,
          transferBy:  req.user.username,
        },
      });
    }

    // Ticket güncelle
    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        departmentId: parseInt(targetDeptId),
        targetDeptId: parseInt(targetDeptId),
        transferNote: note?.trim() || null,
        transferAt:   new Date(),
        transferBy:   req.user.username,
        ...(targetGroupId ? { groupId: parseInt(targetGroupId), status: 'ASSIGNED' } : {}),
      },
      include: {
        department: true,
        group:      { select: { id: true, name: true } },
        createdBy:  { select: { id: true, displayName: true, username: true } },
      },
    });

    await logActivity({
      ticketId:    id,
      userId:      actor.id,
      action:      'GROUP_CHANGED',
      fromValue:   ticket.department?.name || 'Belirsiz',
      toValue:     targetDept.name,
      description: `${actor.displayName} tarafından "${targetDept.name}" dairesine aktarıldı${note ? ': ' + note.trim() : ''}`,
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Aktarma yapılamadı' });
  }
});

// ─── DELETE /api/tickets/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { createdBy: true },
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket bulunamadı' });

    const isOwner = ticket.createdBy.username === req.user.username;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }

    await prisma.ticketActivity.deleteMany({ where: { ticketId: id } });
    await prisma.notificationQueue.deleteMany({ where: { ticketId: id } });
    await prisma.comment.deleteMany({ where: { ticketId: id } });
    await prisma.ticket.delete({ where: { id } });

    res.json({ message: 'Ticket silindi' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ticket silinemedi' });
  }
});

// ─── GET /api/tickets/:id/attachments ────────────────────────────────────────
router.get('/:id/attachments', async (req, res) => {
  const ticketId = parseInt(req.params.id);
  try {
    const attachments = await prisma.attachment.findMany({
      where:   { ticketId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(attachments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ekler alınamadı' });
  }
});

// ─── POST /api/tickets/:id/attachments ───────────────────────────────────────
router.post('/:id/attachments', (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'Dosya boyutu 10 MB sınırını aşıyor'
        : err.message || 'Dosya yükleme hatası';
      return res.status(400).json({ error: msg });
    }
    next();
  });
}, async (req, res) => {
  const ticketId = parseInt(req.params.id);

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Hiç dosya yüklenmedi' });
  }

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: 'Ticket bulunamadı' });

    const user = await prisma.user.upsert({
      where:  { username: req.user.username },
      update: {},
      create: { username: req.user.username, displayName: req.user.displayName, role: req.user.role || 'user' },
    });

    const saved = await Promise.all(req.files.map(file =>
      prisma.attachment.create({
        data: {
          ticketId,
          filename:     file.filename,
          originalName: file.originalname,
          mimetype:     file.mimetype,
          size:         file.size,
          uploadedBy:   req.user.username,
        },
      })
    ));

    await logActivity({
      ticketId,
      userId:      user.id,
      action:      'COMMENTED',
      description: `Dosya eklendi: ${req.files.map(f => f.originalname).join(', ')}`,
    });

    res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Dosya kaydedilemedi' });
  }
});

// ─── POST /api/tickets/:id/comments ──────────────────────────────────────────
router.post('/:id/comments', async (req, res) => {
  const ticketId = parseInt(req.params.id);
  const { content, isInternal } = req.body;

  if (!content) return res.status(400).json({ error: 'Yorum içeriği zorunludur' });

  try {
    const user = await prisma.user.upsert({
      where:  { username: req.user.username },
      update: {},
      create: {
        username:    req.user.username,
        displayName: req.user.displayName,
        role:        req.user.role || 'user',
      },
    });

    const comment = await prisma.comment.create({
      data: { content, ticketId, authorId: user.id, isInternal: isInternal || false },
    });

    await logActivity({
      ticketId,
      userId:      user.id,
      action:      'COMMENTED',
      description: `Ticket #${ticketId} → ${user.displayName} ${isInternal ? 'iç not ekledi' : 'yorum ekledi'}`,
      comment:     isInternal ? '[İç Not]' : null,
    });

    res.status(201).json({ ...comment, author: { id: user.id, displayName: user.displayName } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Yorum eklenemedi' });
  }
});

module.exports = router;
