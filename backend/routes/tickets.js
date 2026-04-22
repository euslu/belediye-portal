const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const { getTicketFilter, getPendingApprovalFilter, canAccessTicket, hasMinRole } = require('../middleware/rbac');
const { logActivity } = require('../lib/activity');
const { notifyTicketCreated, notifyTicketAssigned, notifyTicketResolved } = require('../lib/notifications');
const upload  = require('../lib/upload');
const ulakbell = require('../services/ulakbell');
const logger = require('../utils/logger');
const { logIslem } = require('../middleware/auditLog');
const smsNotif = require('../services/smsNotification');

router.use(authMiddleware);

const STATUS_TR   = { OPEN: 'Açık', PENDING_APPROVAL: 'Onay Bekliyor', ASSIGNED: 'Atandı', IN_PROGRESS: 'İşlemde', RESOLVED: 'Çözüldü', CLOSED: 'Kapalı', REJECTED: 'Reddedildi' };
const PRIORITY_TR = { LOW: 'Düşük', MEDIUM: 'Orta', HIGH: 'Yüksek', CRITICAL: 'Kritik' };

async function getTicketAccessContext(id) {
  return prisma.ticket.findUnique({
    where: { id },
    include: {
      createdBy: { select: { username: true, directorate: true, department: true } },
      assignedTo: { select: { username: true, directorate: true, department: true } },
      group: { select: { name: true, department: true } },
    },
  });
}

async function requireTicketScopeAccess(id, user) {
  const ticket = await getTicketAccessContext(id);
  if (!ticket) return { error: 'not_found' };
  if (!canAccessTicket(user, ticket)) return { error: 'forbidden' };
  return { ticket };
}

function canCreateTicketWorkOrder(user, ticket) {
  const isPrivileged = ['admin', 'manager'].includes(user.role) || hasMinRole(user, 'sef');
  const isAssignee = ticket.assignedTo?.username === user.username;
  return isPrivileged || isAssignee;
}

async function findDepartmentIdForTicket(ticket) {
  const departmentName =
    ticket.targetDepartment ||
    ticket.group?.department ||
    ticket.assignedTo?.department ||
    ticket.createdBy?.department;

  if (!departmentName) return null;

  const department = await prisma.department.findFirst({
    where: { name: departmentName },
    select: { id: true },
  });

  return department?.id || null;
}

// ─── GET /api/categories ──────────────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json(categories);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Kategoriler alınamadı' });
  }
});

// ─── GET /api/tickets ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { status, priority, categoryId, createdBy, assignedTo, directorate, limit, source } = req.query;

  // RBAC filtresi — kullanıcının sadece görmesi gereken ticket'ları döndür
  const rbacFilter = await getTicketFilter(req.user);

  const extraFilters = {};
  if (status)     extraFilters.status     = status;
  if (priority)   extraFilters.priority   = priority;
  if (source)     extraFilters.source     = source;
  if (categoryId) extraFilters.categoryId = parseInt(categoryId);
  if (directorate) extraFilters.createdBy = { directorate };

  // ?createdBy=me veya ?assignedTo=me — kendi kayıtları (RBAC zaten kapsar ama explicit override)
  if (createdBy === 'me' || assignedTo === 'me') {
    const me = await prisma.user.findUnique({ where: { username: req.user.username }, select: { id: true } });
    if (me) {
      if (createdBy  === 'me') extraFilters.createdById  = me.id;
      if (assignedTo === 'me') extraFilters.assignedToId = me.id;
    }
  }

  // RBAC filtresi ile extraFilters'ı AND ile birleştir
  // rbacFilter boş ise ({}) extraFilters doğrudan kullanılır
  const where = Object.keys(rbacFilter).length
    ? { AND: [rbacFilter, extraFilters] }
    : extraFilters;

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
    logger.error(err);
    res.status(500).json({ error: 'Ticketlar alınamadı' });
  }
});

// ─── GET /api/tickets/pending-approval ───────────────────────────────────────
// admin/daire_baskani/mudur → kendi biriminin onay bekleyen talepleri
router.get('/pending-approval', async (req, res) => {
  if (!hasMinRole(req.user, 'mudur') && !['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  try {
    const where = getPendingApprovalFilter(req.user);
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
    logger.error(err);
    res.status(500).json({ error: 'Onay bekleyen talepler alınamadı' });
  }
});

// ─── GET /api/tickets/pending-approval/count ─────────────────────────────────
router.get('/pending-approval/count', async (req, res) => {
  if (!hasMinRole(req.user, 'mudur') && !['admin', 'manager'].includes(req.user.role))
    return res.json({ count: 0 });

  try {
    const where = getPendingApprovalFilter(req.user);
    const count = await prisma.ticket.count({ where });
    res.json({ count });
  } catch (err) {
    logger.error(err);
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
  let tokenUser;

  if (!rawToken) return res.status(401).json({ error: 'Token gerekli' });
  try {
    tokenUser = jwt.verify(rawToken, process.env.JWT_SECRET);
  } catch {
    return res.status(403).json({ error: 'Geçersiz token' });
  }

  const attachmentId = parseInt(req.params.attachmentId);
  try {
    const att = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        ticket: {
          include: {
            createdBy: { select: { username: true, directorate: true, department: true } },
            assignedTo: { select: { username: true, directorate: true, department: true } },
            group: { select: { name: true, department: true } },
          },
        },
      },
    });
    if (!att) return res.status(404).json({ error: 'Dosya bulunamadı' });
    if (!att.ticket || !canAccessTicket(tokenUser, att.ticket)) {
      return res.status(403).json({ error: 'Bu dosyaya erişim yetkiniz yok' });
    }

    const filePath = path.join(__dirname, '../uploads/tickets', String(att.ticketId), att.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Dosya diskte bulunamadı' });

    res.download(filePath, att.originalName);
  } catch (err) {
    logger.error(err);
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
        assignedTo: { select: { id: true, displayName: true, username: true, directorate: true, department: true } },
        group:      { select: { id: true, name: true, department: true } },
        category:      true,
        subject:       { include: { category: { select: { id: true, name: true, icon: true } }, defaultGroup: { select: { id: true, name: true } } } },
        iadeYonlendir: { select: { id: true, displayName: true } },
        comments:      { orderBy: { createdAt: 'asc' } },
        activities: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, displayName: true, username: true } },
          },
        },
      },
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (!canAccessTicket(req.user, ticket)) {
      return res.status(403).json({ error: 'Bu ticket\'a erişim yetkiniz yok' });
    }

    res.json(ticket);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Ticket alınamadı' });
  }
});

// ─── POST /api/tickets/:id/work-orders ───────────────────────────────────────
router.post('/:id/work-orders', async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const scope = await requireTicketScopeAccess(id, req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (scope.error === 'forbidden') return res.status(403).json({ error: 'Bu ticket için iş emri oluşturma yetkiniz yok' });

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, displayName: true, username: true, department: true } },
        assignedTo: { select: { id: true, displayName: true, username: true, department: true } },
        group: { select: { id: true, name: true, department: true } },
        category: { select: { id: true, name: true } },
      },
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (!canCreateTicketWorkOrder(req.user, ticket)) {
      return res.status(403).json({ error: 'Bu ticket için iş emri oluşturma yetkiniz yok' });
    }
    if (['PENDING_APPROVAL', 'REJECTED', 'CLOSED'].includes(ticket.status)) {
      return res.status(400).json({ error: 'Bu durumdaki ticket için iş emri oluşturulamaz' });
    }

    const actorUser = await prisma.user.upsert({
      where: { username: req.user.username },
      update: { displayName: req.user.displayName },
      create: {
        username: req.user.username,
        displayName: req.user.displayName,
        role: req.user.role || 'user',
        department: req.user.department || null,
        directorate: req.user.directorate || null,
      },
    });

    const departmentId = await findDepartmentIdForTicket(ticket);

    const workOrder = await prisma.workOrder.create({
      data: {
        title: `İş Emri · #${ticket.id} · ${ticket.title}`,
        description: ticket.description
          ? `Ticket #${ticket.id} için oluşturuldu.\n\n${ticket.description}`
          : `Ticket #${ticket.id} için oluşturuldu.`,
        priority: ticket.priority || 'MEDIUM',
        status: 'TODO',
        ticketId: ticket.id,
        groupId: ticket.group?.id || null,
        assignedToId: ticket.assignedTo?.id || null,
        departmentId,
        createdById: actorUser.id,
      },
      include: {
        createdBy: { select: { id: true, displayName: true, username: true } },
        assignedTo: { select: { id: true, displayName: true, username: true } },
        group: { select: { id: true, name: true } },
        department: { select: { id: true, name: true, shortCode: true } },
        ticket: { select: { id: true, title: true, status: true } },
      },
    });

    await logActivity({
      ticketId: ticket.id,
      userId: actorUser.id,
      action: 'COMMENTED',
      description: `Ticket için iş emri oluşturuldu (#${workOrder.id})`,
      comment: `${workOrder.title} iş akışına eklendi.`,
    });

    let updatedTicketStatus = ticket.status;
    if (['OPEN', 'ASSIGNED'].includes(ticket.status)) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'IN_PROGRESS',
          closedAt: null,
        },
      });
      updatedTicketStatus = 'IN_PROGRESS';

      await logActivity({
        ticketId: ticket.id,
        userId: actorUser.id,
        action: 'STATUS_CHANGED',
        fromValue: ticket.status,
        toValue: 'IN_PROGRESS',
        description: `İş emri oluşturulduğu için ticket işlemde durumuna alındı`,
      });
    }

    logIslem({
      kullanici: req.user.username,
      kullaniciAd: req.user.displayName,
      islem: 'CREATE',
      modul: 'work-order',
      kayitId: workOrder.id,
      detay: { ticketId: ticket.id, fromTicket: true },
      ip: req.ip,
    });

    res.status(201).json({
      workOrder,
      ticketStatus: updatedTicketStatus,
      message: 'Ticket üzerinden iş emri oluşturuldu',
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Ticket üzerinden iş emri oluşturulamadı' });
  }
});

// ─── POST /api/tickets ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { title, description, priority, type, categoryId, subjectId, dueDate, source,
          ilceId, mahalleId, sokakId, binaId } = req.body;

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
    let slaHoursResolved = null;
    if (subjectId) {
      const subj = await prisma.subject.findUnique({
        where:  { id: parseInt(subjectId) },
        select: { defaultGroupId: true, defaultGroup: { select: { name: true } }, slaHours: true },
      });
      if (subj?.defaultGroupId) {
        autoGroupId   = subj.defaultGroupId;
        autoGroupName = subj.defaultGroup?.name || null;
      }
      if (subj?.slaHours) slaHoursResolved = subj.slaHours;
    }

    // Kategori fallback: grup ve SLA
    if (categoryId) {
      const cat = await prisma.category.findUnique({
        where:  { id: parseInt(categoryId) },
        select: { assignedGroupId: true, assignedGroup: { select: { name: true } }, slaHours: true },
      });
      if (!autoGroupId && cat?.assignedGroupId) {
        autoGroupId   = cat.assignedGroupId;
        autoGroupName = cat.assignedGroup?.name || null;
      }
      if (!slaHoursResolved && cat?.slaHours) slaHoursResolved = cat.slaHours;
    }

    // SLA fallback: Settings priority-based
    if (!slaHoursResolved) {
      const slaKey = `sla_${(priority || 'MEDIUM').toLowerCase()}_hours`;
      const setting = await prisma.systemSetting.findUnique({ where: { key: slaKey } });
      if (setting?.value) slaHoursResolved = parseInt(setting.value);
    }

    // dueDate hesapla
    const resolvedDueDate = dueDate
      ? new Date(dueDate)
      : slaHoursResolved
        ? new Date(Date.now() + slaHoursResolved * 3600000)
        : null;

    // REQUEST tipi talepler yönetici onayına gider; INCIDENT doğrudan atanır
    const resolvedType = type || 'INCIDENT';
    let initialStatus;
    if (resolvedType === 'REQUEST') {
      initialStatus = 'PENDING_APPROVAL';
    } else {
      initialStatus = autoGroupId ? 'ASSIGNED' : 'OPEN';
    }

    // RBAC: targetDirectorate — grubun dairesini veya category'den belirle
    let targetDirectorate = null;
    let targetDepartment  = null;
    if (autoGroupId) {
      const grp = await prisma.group.findUnique({ where: { id: autoGroupId }, select: { department: true } });
      targetDepartment  = grp?.department || null;
    }
    // Konu üzerinden directorate/department de gelebilir (subject.category.department vb.)
    // Şimdilik grubun department'ını kullan; ilerletme için genişletilebilir

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        priority:          priority   || 'MEDIUM',
        type:              resolvedType,
        dueDate:           resolvedDueDate,
        categoryId:        categoryId ? parseInt(categoryId) : null,
        subjectId:         subjectId  ? parseInt(subjectId)  : null,
        groupId:           resolvedType === 'REQUEST' ? null : autoGroupId,
        status:            initialStatus,
        approvalStatus:    resolvedType === 'REQUEST' ? 'PENDING_APPROVAL' : null,
        source:            source || 'PORTAL',
        targetDirectorate,
        targetDepartment,
        ilceId:            ilceId     ? parseInt(ilceId)    : null,
        mahalleId:         mahalleId  ? parseInt(mahalleId) : null,
        sokakId:           sokakId    ? parseInt(sokakId)   : null,
        binaId:            binaId     ? parseInt(binaId)    : null,
        createdById:       user.id,
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
      logger.info(`[Yönlendirme] Ticket #${ticket.id} → ${autoGroupName} grubuna atandı`);
    }

    // Bildirim: açana onay + grubun mail adresine
    notifyTicketCreated(
      { ...ticket, createdBy: { ...ticket.createdBy, email: user.email } },
      autoGroupName
    ).catch(() => {});

    // ulakBELL otomatik gönderim (ULAKBELL_SYNC=true ise)
    if (process.env.ULAKBELL_SYNC === 'true') {
      ulakbell.createIncident(
        { ...ticket, ilceId, mahalleId, sokakId, binaId },
        { displayName: user.displayName, email: user.email, phone: user.phone }
      ).then(async (publicToken) => {
        if (publicToken) {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { ulakbellToken: publicToken },
          });
          logger.info(`[ulakBELL] Ticket #${ticket.id} → token: ${publicToken}`);
        }
      }).catch((err) => {
        logger.error(`[ulakBELL] Hata Ticket #${ticket.id}:`, err.message);
      });
    }

    logIslem({ kullanici: req.user.username, kullaniciAd: req.user.displayName, islem: 'CREATE', modul: 'ticket', kayitId: ticket.id, detay: { title, priority: priority || 'MEDIUM', type: resolvedType }, ip: req.ip });

    res.status(201).json(ticket);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Ticket oluşturulamadı' });
  }
});

// ─── PATCH /api/tickets/:id ───────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, description, status, priority, categoryId, assignedToId } = req.body;

  try {
    const existing = await getTicketAccessContext(id);
    if (!existing) return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (!canAccessTicket(req.user, existing)) {
      return res.status(403).json({ error: 'Bu ticket üzerinde işlem yetkiniz yok' });
    }

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

    if (status !== undefined && status !== existing.status) {
      logIslem({ kullanici: req.user.username, kullaniciAd: req.user.displayName, islem: 'STATUS_CHANGED', modul: 'ticket', kayitId: id, detay: { from: existing.status, to: status }, ip: req.ip });
    }

    if (assignedToId !== undefined && assignedToId !== existing.assignedToId && ticket.assignedTo) {
      logIslem({ kullanici: req.user.username, kullaniciAd: req.user.displayName, islem: 'ASSIGN', modul: 'ticket', kayitId: id, detay: { assignedTo: ticket.assignedTo.displayName }, ip: req.ip });
      const isReassign = existing.assignedToId !== null;
      notifyTicketAssigned(ticket, actorUser.displayName, isReassign).catch(() => {});
      // SMS: atanan personele bildirim
      smsNotif.smsTicketAtandi(ticket, ticket.assignedTo.id).catch(() => {});

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

      // SMS: atanan personele durum değişikliği bildirimi
      smsNotif.smsTicketDurumDegisti(ticket, status, ticket.assignedToId).catch(() => {});
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
    logger.error(err);
    res.status(500).json({ error: 'Ticket güncellenemedi' });
  }
});

// ─── POST /api/tickets/:id/approve ────────────────────────────────────────────
router.post('/:id/approve', async (req, res) => {
  if (!hasMinRole(req.user, 'mudur') && !['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  try {
    const scope = await requireTicketScopeAccess(id, req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (scope.error === 'forbidden') return res.status(403).json({ error: 'Bu talebi onaylama yetkiniz yok' });

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
    logger.error(err);
    res.status(500).json({ error: 'Talep onaylanamadı' });
  }
});

// ─── POST /api/tickets/:id/reject ─────────────────────────────────────────────
router.post('/:id/reject', async (req, res) => {
  if (!hasMinRole(req.user, 'mudur') && !['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  const { reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ error: 'Red gerekçesi zorunludur' });

  try {
    const scope = await requireTicketScopeAccess(id, req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (scope.error === 'forbidden') return res.status(403).json({ error: 'Bu talebi reddetme yetkiniz yok' });

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
    logger.error(err);
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
    const scope = await requireTicketScopeAccess(id, req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (scope.error === 'forbidden') return res.status(403).json({ error: 'Bu ticket\'ı aktarma yetkiniz yok' });

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
    logger.error(err);
    res.status(500).json({ error: 'Aktarma yapılamadı' });
  }
});

// ─── POST /api/tickets/:id/iade-talebi ────────────────��───────────────────────
router.post('/:id/iade-talebi', async (req, res) => {
  const id = parseInt(req.params.id);
  const { aciklama, yonlendirId } = req.body;
  if (!aciklama?.trim()) return res.status(400).json({ error: 'İade a��ıklaması zorunludur' });

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { assignedTo: { select: { username: true } } },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (ticket.assignedTo?.username !== req.user.username)
      return res.status(403).json({ error: 'Sadece atanan personel iade talebi oluşturabilir' });
    if (ticket.iadeDurumu === 'PENDING')
      return res.status(400).json({ error: 'Zaten bekleyen bir iade talebi var' });

    const actor = await prisma.user.upsert({
      where: { username: req.user.username },
      update: {},
      create: { username: req.user.username, displayName: req.user.displayName, role: req.user.role || 'user' },
    });

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        iadeDurumu:      'PENDING',
        iadeAciklama:    aciklama.trim(),
        iadeYonlendirId: yonlendirId ? parseInt(yonlendirId) : null,
      },
      include: {
        assignedTo:    { select: { id: true, displayName: true, username: true } },
        iadeYonlendir: { select: { id: true, displayName: true } },
      },
    });

    await logActivity({
      ticketId: id,
      userId:   actor.id,
      action:   'RETURN_REQUESTED',
      description: `${actor.displayName} görevi iade etmek istiyor: "${aciklama.trim()}"${yonlendirId ? ` (yönlendirme önerisi var)` : ''}`,
    });

    res.json(updated);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'İade talebi oluşturulamadı' });
  }
});

// ─── POST /api/tickets/:id/iade-onayla ────────────────────��──────────────────
router.post('/:id/iade-onayla', async (req, res) => {
  if (!hasMinRole(req.user, 'sef') && !['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  try {
    const scope = await requireTicketScopeAccess(id, req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (scope.error === 'forbidden') return res.status(403).json({ error: 'Bu ticket üzerinde iade onay yetkiniz yok' });

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { iadeYonlendir: { select: { id: true, displayName: true } } },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (ticket.iadeDurumu !== 'PENDING')
      return res.status(400).json({ error: 'Bekleyen iade talebi yok' });

    const actor = await prisma.user.upsert({
      where: { username: req.user.username },
      update: {},
      create: { username: req.user.username, displayName: req.user.displayName, role: req.user.role || 'user' },
    });

    const data = {
      iadeDurumu:    'APPROVED',
      iadeOnayci:    req.user.username,
      iadeOnayTarih: new Date(),
    };

    if (ticket.iadeYonlendirId) {
      data.assignedToId = ticket.iadeYonlendirId;
      data.status       = 'ASSIGNED';
    } else {
      data.assignedToId = null;
      data.status       = 'OPEN';
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data,
      include: {
        assignedTo: { select: { id: true, displayName: true, username: true } },
        group:      { select: { id: true, name: true } },
      },
    });

    const yonDesc = ticket.iadeYonlendir
      ? ` ve ${ticket.iadeYonlendir.displayName}'e yönlendirildi`
      : ' ve havuza döndürüldü';
    await logActivity({
      ticketId: id,
      userId:   actor.id,
      action:   'RETURN_APPROVED',
      description: `İade talebi ${actor.displayName} tarafından onaylandı${yonDesc}`,
    });

    if (ticket.iadeYonlendirId && updated.assignedTo) {
      notifyTicketAssigned(updated, actor.displayName, true).catch(() => {});
    }

    res.json(updated);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'İade onaylanamadı' });
  }
});

// ─── POST /api/tickets/:id/iade-reddet ────────────────────���─────────────────
router.post('/:id/iade-reddet', async (req, res) => {
  if (!hasMinRole(req.user, 'sef') && !['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  try {
    const scope = await requireTicketScopeAccess(id, req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (scope.error === 'forbidden') return res.status(403).json({ error: 'Bu ticket üzerinde iade red yetkiniz yok' });

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (ticket.iadeDurumu !== 'PENDING')
      return res.status(400).json({ error: 'Bekleyen iade talebi yok' });

    const actor = await prisma.user.upsert({
      where: { username: req.user.username },
      update: {},
      create: { username: req.user.username, displayName: req.user.displayName, role: req.user.role || 'user' },
    });

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        iadeDurumu:    'REJECTED',
        iadeOnayci:    req.user.username,
        iadeOnayTarih: new Date(),
      },
      include: {
        assignedTo: { select: { id: true, displayName: true, username: true } },
      },
    });

    await logActivity({
      ticketId: id,
      userId:   actor.id,
      action:   'RETURN_REJECTED',
      description: `İade talebi ${actor.displayName} tarafından reddedildi`,
    });

    res.json(updated);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'İade reddedilemedi' });
  }
});

// ─── POST /api/tickets/:id/reassign ────────────────────────────────────────
router.post('/:id/reassign', async (req, res) => {
  if (!hasMinRole(req.user, 'mudur') && !['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  const { assignedToId } = req.body;
  if (!assignedToId) return res.status(400).json({ error: 'Atanacak kişi zorunludur' });

  try {
    const scope = await requireTicketScopeAccess(id, req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (scope.error === 'forbidden') return res.status(403).json({ error: 'Bu ticket üzerinde yeniden atama yetkiniz yok' });

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { assignedTo: { select: { id: true, displayName: true } } },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket bulunamadı' });

    const actor = await prisma.user.upsert({
      where: { username: req.user.username },
      update: {},
      create: { username: req.user.username, displayName: req.user.displayName, role: req.user.role || 'user' },
    });

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        assignedToId:    parseInt(assignedToId),
        status:          'ASSIGNED',
        iadeDurumu:      null,
        iadeAciklama:    null,
        iadeYonlendirId: null,
        iadeOnayci:      null,
        iadeOnayTarih:   null,
      },
      include: {
        assignedTo: { select: { id: true, displayName: true, username: true } },
        group:      { select: { id: true, name: true } },
        createdBy:  { select: { id: true, displayName: true } },
      },
    });

    const oldName = ticket.assignedTo?.displayName || 'kimse';
    await logActivity({
      ticketId: id,
      userId:   actor.id,
      action:   'REASSIGNED',
      fromValue: String(ticket.assignedToId || ''),
      toValue:   String(assignedToId),
      description: `${actor.displayName} tarafından ${oldName} -> ${updated.assignedTo.displayName} olarak yeniden atandı`,
    });

    notifyTicketAssigned(updated, actor.displayName, true).catch(() => {});
    // SMS: yeniden atanan personele bildirim
    smsNotif.smsTicketAtandi(updated, updated.assignedTo.id).catch(() => {});

    res.json(updated);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Yeniden atama yapılamadı' });
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
    logger.error(err);
    res.status(500).json({ error: 'Ticket silinemedi' });
  }
});

// ─── GET /api/tickets/:id/attachments ────────────────────────────────────────
router.get('/:id/attachments', async (req, res) => {
  const ticketId = parseInt(req.params.id);
  try {
    const ticket = await getTicketAccessContext(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (!canAccessTicket(req.user, ticket)) {
      return res.status(403).json({ error: 'Bu ticket\'ın eklerine erişim yetkiniz yok' });
    }

    const attachments = await prisma.attachment.findMany({
      where:   { ticketId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(attachments);
  } catch (err) {
    logger.error(err);
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
    const ticket = await getTicketAccessContext(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (!canAccessTicket(req.user, ticket)) {
      return res.status(403).json({ error: 'Bu ticket\'a dosya ekleme yetkiniz yok' });
    }

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
    logger.error(err);
    res.status(500).json({ error: 'Dosya kaydedilemedi' });
  }
});

// ─── POST /api/tickets/:id/comments ──────────────────────────────────────────
router.post('/:id/comments', async (req, res) => {
  const ticketId = parseInt(req.params.id);
  const { content, isInternal } = req.body;

  if (!content) return res.status(400).json({ error: 'Yorum içeriği zorunludur' });

  try {
    const ticket = await getTicketAccessContext(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket bulunamadı' });
    if (!canAccessTicket(req.user, ticket)) {
      return res.status(403).json({ error: 'Bu ticket\'a yorum ekleme yetkiniz yok' });
    }

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
    logger.error(err);
    res.status(500).json({ error: 'Yorum eklenemedi' });
  }
});

module.exports = router;
