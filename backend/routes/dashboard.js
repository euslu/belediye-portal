const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────

function periodRange(period) {
  const now = new Date();
  const start = new Date(now);
  if      (period === 'week')    start.setDate(now.getDate() - 7);
  else if (period === '3months') start.setMonth(now.getMonth() - 3);
  else                           start.setMonth(now.getMonth() - 1); // default: month
  start.setHours(0, 0, 0, 0);

  // Önceki dönem (karşılaştırma için)
  const prevEnd   = new Date(start);
  const prevStart = new Date(start);
  const diffMs = now - start;
  prevStart.setTime(start.getTime() - diffMs);

  return { start, end: now, prevStart, prevEnd };
}

// SLA saatleri (saat cinsinden) — settings tablosundan
const SLA_DEFAULTS = { CRITICAL: 4, HIGH: 8, MEDIUM: 24, LOW: 72 };
async function getSlaHours(prisma) {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: ['sla_critical', 'sla_high', 'sla_medium', 'sla_low'] } },
    });
    const map = Object.fromEntries(rows.map(r => [r.key, parseInt(r.value)]));
    return {
      CRITICAL: map.sla_critical || SLA_DEFAULTS.CRITICAL,
      HIGH:     map.sla_high     || SLA_DEFAULTS.HIGH,
      MEDIUM:   map.sla_medium   || SLA_DEFAULTS.MEDIUM,
      LOW:      map.sla_low      || SLA_DEFAULTS.LOW,
    };
  } catch { return SLA_DEFAULTS; }
}

function isSlaBreached(ticket, slaHours) {
  const limit = slaHours[ticket.priority] || 24;
  const limitMs = limit * 3600 * 1000;
  const end = ticket.closedAt || new Date();
  return (end - ticket.createdAt) > limitMs;
}

// ─── GET /api/dashboard/manager-stats ────────────────────────────────────────
router.get('/manager-stats', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const { period = 'month' } = req.query;
  const { start, end, prevStart, prevEnd } = periodRange(period);

  // Manager → kendi birimi; Admin → tüm birimler
  const dirFilter = (req.user.role === 'manager' && req.user.directorate)
    ? { createdBy: { directorate: req.user.directorate } }
    : {};

  try {
    const slaHours = await getSlaHours(prisma);

    // ── Mevcut dönem tüm ticket'ları ─────────────────────────────────────────
    const tickets = await prisma.ticket.findMany({
      where: {
        ...dirFilter,
        createdAt: { gte: start, lte: end },
      },
      include: {
        createdBy:  { select: { username: true, displayName: true, directorate: true } },
        assignedTo: { select: { username: true, displayName: true } },
        subject:    { select: { name: true } },
        group:      { select: { name: true } },
        activities: {
          where: { action: { in: ['REASSIGNED', 'GROUP_CHANGED'] } },
          include: { user: { select: { username: true, displayName: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // ── Önceki dönem sayıları ─────────────────────────────────────────────────
    const prevTickets = await prisma.ticket.findMany({
      where: {
        ...dirFilter,
        createdAt: { gte: prevStart, lte: prevEnd },
      },
      select: {
        status: true, priority: true,
        createdAt: true, closedAt: true, updatedAt: true,
      },
    });

    // ── Özet hesapla ─────────────────────────────────────────────────────────
    const resolved  = tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
    const resolvedMs = resolved
      .map(t => (t.closedAt || t.updatedAt) - t.createdAt)
      .filter(ms => ms > 0);
    const avgResolutionHours = resolvedMs.length
      ? Math.round(resolvedMs.reduce((a, b) => a + b, 0) / resolvedMs.length / 3600000)
      : 0;

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const slaBreaches     = tickets.filter(t => isSlaBreached(t, slaHours)).length;
    const pendingApproval = tickets.filter(t => t.status === 'PENDING_APPROVAL').length;
    const inProgress      = tickets.filter(t => t.status === 'IN_PROGRESS').length;
    const resolvedToday   = tickets.filter(t =>
      ['RESOLVED', 'CLOSED'].includes(t.status) &&
      (t.closedAt || t.updatedAt) >= todayStart
    ).length;
    const transferred = tickets.filter(t => t.activities.some(a => a.action === 'REASSIGNED' || a.action === 'GROUP_CHANGED')).length;

    // Önceki dönem
    const prevResolved = prevTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
    const prevResolvedMs = prevResolved
      .map(t => (t.closedAt || t.updatedAt) - t.createdAt)
      .filter(ms => ms > 0);
    const prevAvgHours = prevResolvedMs.length
      ? Math.round(prevResolvedMs.reduce((a, b) => a + b, 0) / prevResolvedMs.length / 3600000)
      : 0;
    const prevBreaches = prevTickets.filter(t => isSlaBreached(t, slaHours)).length;

    const pct = (curr, prev) => prev === 0 ? null : Math.round((curr - prev) / prev * 100);

    const summary = {
      total:               tickets.length,
      totalPrev:           prevTickets.length,
      totalChange:         pct(tickets.length, prevTickets.length),
      resolved:            resolved.length,
      resolvedPrev:        prevResolved.length,
      resolvedChange:      pct(resolved.length, prevResolved.length),
      resolvedRate:        tickets.length ? Math.round(resolved.length / tickets.length * 100) : 0,
      avgResolutionHours,
      avgResolutionHoursPrev: prevAvgHours,
      avgResolutionChange: pct(avgResolutionHours, prevAvgHours),
      slaBreaches,
      slaBraechsPrev:      prevBreaches,
      slaBreachesChange:   pct(slaBreaches, prevBreaches),
      pendingApproval,
      inProgress,
      resolvedToday,
      transferred,
    };

    // ── Günlük trend (gün başına açılan / kapanan) ────────────────────────────
    const dayMap = {};
    const dayCount = Math.min(Math.ceil((end - start) / 86400000), 90);
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = { date: key, opened: 0, closed: 0 };
    }

    tickets.forEach(t => {
      const openKey  = t.createdAt.toISOString().slice(0, 10);
      if (dayMap[openKey]) dayMap[openKey].opened++;
      if (t.closedAt || ['RESOLVED','CLOSED'].includes(t.status)) {
        const closeKey = (t.closedAt || t.updatedAt).toISOString().slice(0, 10);
        if (dayMap[closeKey]) dayMap[closeKey].closed++;
      }
    });

    const daily = Object.values(dayMap);

    // ── Tip dağılımı ──────────────────────────────────────────────────────────
    const byTypeMap = {};
    tickets.forEach(t => { byTypeMap[t.type] = (byTypeMap[t.type] || 0) + 1; });
    const byType = Object.entries(byTypeMap).map(([type, count]) => ({ type, count }));

    // ── Durum dağılımı ────────────────────────────────────────────────────────
    const statusDist = {};
    tickets.forEach(t => { statusDist[t.status] = (statusDist[t.status] || 0) + 1; });

    // ── Top 5 konu ────────────────────────────────────────────────────────────
    const subjectMap = {};
    tickets.forEach(t => {
      if (t.subject?.name) subjectMap[t.subject.name] = (subjectMap[t.subject.name] || 0) + 1;
    });
    const topSubjects = Object.entries(subjectMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // ── Personel performansı ──────────────────────────────────────────────────
    const perfMap = {};
    tickets.forEach(t => {
      if (!t.assignedTo) return;
      const u = t.assignedTo.username;
      if (!perfMap[u]) perfMap[u] = { username: u, displayName: t.assignedTo.displayName, resolved: 0, totalMs: 0, slaBreaches: 0 };
      if (['RESOLVED','CLOSED'].includes(t.status)) {
        perfMap[u].resolved++;
        const ms = (t.closedAt || t.updatedAt) - t.createdAt;
        if (ms > 0) perfMap[u].totalMs += ms;
      }
      if (isSlaBreached(t, slaHours)) perfMap[u].slaBreaches++;
    });

    const topPerformers = Object.values(perfMap)
      .sort((a, b) => b.resolved - a.resolved).slice(0, 5)
      .map(p => ({
        username:    p.username,
        displayName: p.displayName,
        resolved:    p.resolved,
        avgHours:    p.resolved > 0 ? Math.round(p.totalMs / p.resolved / 3600000) : 0,
      }));

    const slaBreachUsers = Object.values(perfMap)
      .filter(p => p.slaBreaches > 0)
      .sort((a, b) => b.slaBreaches - a.slaBreaches).slice(0, 10)
      .map(p => ({ username: p.username, displayName: p.displayName, breachCount: p.slaBreaches }));

    // ── Aktarma kayıtları ─────────────────────────────────────────────────────
    const transfers = [];
    tickets.forEach(t => {
      t.activities
        .filter(a => a.action === 'REASSIGNED' || a.action === 'GROUP_CHANGED')
        .forEach(a => {
          transfers.push({
            ticketId:  t.id,
            title:     t.title,
            fromValue: a.fromValue || '—',
            toValue:   a.toValue   || '—',
            date:      a.createdAt,
            by:        a.user?.displayName || a.user?.username || '—',
            reason:    a.description || a.comment || '—',
          });
        });
    });
    transfers.sort((a, b) => b.date - a.date);

    // ── Bekleyen onaylar (detaylı) ────────────────────────────────────────────
    const pendingApprovals = await prisma.ticket.findMany({
      where: { ...dirFilter, status: 'PENDING_APPROVAL' },
      select: {
        id: true, title: true, createdAt: true, priority: true,
        createdBy: { select: { displayName: true, username: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });

    res.json({
      summary,
      daily,
      byType,
      statusDist,
      topSubjects,
      topPerformers,
      slaBreachUsers,
      transfers: transfers.slice(0, 20),
      pendingApprovals,
      directorate: req.user.directorate || null,
    });

  } catch (err) {
    console.error('[manager-stats]', err);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

// ─── GET /api/dashboard/my-stats ──────────────────────────────────────────────
router.get('/my-stats', async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where:  { username: req.user.username },
      select: { id: true },
    });
    if (!me) return res.json({ openTickets: 0, resolvedThisMonth: 0, myTasks: 0, slaRisk: 0 });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const slaRiskDeadline = new Date(Date.now() + 2 * 3600 * 1000);

    const [openTickets, resolvedThisMonth, myTasks, slaRisk] = await Promise.all([
      prisma.ticket.count({
        where: { createdById: me.id, status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED'] } },
      }),
      prisma.ticket.count({
        where: { createdById: me.id, status: { in: ['RESOLVED', 'CLOSED'] }, updatedAt: { gte: monthStart } },
      }),
      prisma.ticket.count({
        where: { assignedToId: me.id, status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED'] } },
      }),
      prisma.ticket.count({
        where: {
          assignedToId: me.id,
          dueDate:      { not: null, lt: slaRiskDeadline },
          status:       { notIn: ['RESOLVED', 'CLOSED'] },
        },
      }),
    ]);

    res.json({ openTickets, resolvedThisMonth, myTasks, slaRisk });
  } catch (err) {
    console.error('[my-stats]', err);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

// ─── GET /api/dashboard/my-devices ────────────────────────────────────────────
router.get('/my-devices', async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      where: { assignedTo: req.user.username, active: true },
      select: { id: true, name: true, type: true, brand: true, model: true, status: true, ipAddress: true, lastSyncAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(devices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cihazlar alınamadı' });
  }
});

module.exports = router;
