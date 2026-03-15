const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

const { fetchAdComputers, MOCK_COMPUTERS } = require('../lib/adComputers');
const { syncDevicesFromAD } = require('../lib/adDeviceSync');

const VALID_TYPES = [
  'BILGISAYAR', 'DIZUSTU', 'IPAD_TABLET', 'IP_TELEFON', 'MONITOR',
  'YAZICI', 'SWITCH', 'ACCESS_POINT', 'SUNUCU', 'UPS', 'DIGER',
];
const VALID_STATUSES = ['ACTIVE', 'PASSIVE', 'BROKEN', 'TRANSFERRED'];

// ─── GET /api/inventory/ad-computers ─────────────────────────────────────────
// AD'deki bilgisayar nesnelerini çeker, DB ile karşılaştırır
router.get('/ad-computers', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  try {
    let computers;
    if (process.env.MOCK_AUTH === 'true') {
      computers = MOCK_COMPUTERS.map(c => ({ ...c })); // kopya — alreadyInInventory mutasyona uğramasın
    } else {
      computers = await fetchAdComputers();
    }

    // DB'deki Device tablosuyla karşılaştır
    const names   = computers.map(c => c.name).filter(Boolean);
    const serials = computers.map(c => c.serialNumber).filter(Boolean);

    const existing = await prisma.device.findMany({
      where: {
        active: true,
        OR: [
          { name: { in: names } },
          ...(serials.length ? [{ serialNumber: { in: serials } }] : []),
        ],
      },
      select: { name: true, serialNumber: true },
    });

    const existingNames   = new Set(existing.map(d => d.name?.toUpperCase()));
    const existingSerials = new Set(existing.map(d => d.serialNumber).filter(Boolean));

    computers = computers.map(c => ({
      ...c,
      alreadyInInventory:
        existingNames.has(c.name?.toUpperCase()) ||
        Boolean(c.serialNumber && existingSerials.has(c.serialNumber)),
    }));

    // Son girişe göre sırala — en son giriş yapan önce, giriş bilgisi olmayanlar sona
    computers.sort((a, b) => {
      if (!a.lastLogon && !b.lastLogon) return a.name.localeCompare(b.name);
      if (!a.lastLogon) return 1;
      if (!b.lastLogon) return -1;
      return new Date(b.lastLogon) - new Date(a.lastLogon);
    });

    res.json(computers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AD bilgisayarları alınamadı' });
  }
});

// ─── GET /api/inventory/stats ─────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const userGroups = req.user.groups || [];
    const isAdmin = req.user.role === 'admin' || userGroups.includes('int_bislem');

    const baseWhere = { active: true };
    if (!isAdmin && req.user.directorate) {
      baseWhere.directorate = req.user.directorate;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

    const [byType, addedToday, addedThisWeek, total] = await Promise.all([
      prisma.device.groupBy({ by: ['type'], where: baseWhere, _count: { type: true } }),
      prisma.device.count({ where: { ...baseWhere, createdAt: { gte: today } } }),
      prisma.device.count({ where: { ...baseWhere, createdAt: { gte: monday } } }),
      prisma.device.count({ where: baseWhere }),
    ]);

    const totalByType = Object.fromEntries(byType.map((r) => [r.type, r._count.type]));

    res.json({ total, totalByType, addedToday, addedThisWeek });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

// ─── GET /api/inventory/directorates ─────────────────────────────────────────
router.get('/directorates', async (req, res) => {
  try {
    const userGroups = req.user.groups || [];
    const isAdmin = req.user.role === 'admin' || userGroups.includes('int_bislem');

    const deviceWhere = { active: true, directorate: { not: null } };
    if (!isAdmin && req.user.directorate) {
      deviceWhere.directorate = req.user.directorate;
    }

    let rows = await prisma.device.findMany({
      where:    deviceWhere,
      select:   { directorate: true },
      distinct: ['directorate'],
    });

    // Cihazlarda directorate yoksa User tablosundan al
    if (rows.length === 0) {
      const userWhere = { directorate: { not: null } };
      if (!isAdmin && req.user.directorate) {
        userWhere.directorate = req.user.directorate;
      }
      rows = await prisma.user.findMany({
        where:    userWhere,
        select:   { directorate: true },
        distinct: ['directorate'],
      });
    }

    const list = rows.map((r) => r.directorate).filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'));
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Daireler alınamadı' });
  }
});

// ─── GET /api/inventory ───────────────────────────────────────────────────────
// Filtreler: type, status, locationId, assignedTo, directorate, isShared
router.get('/', async (req, res) => {
  const {
    type, status, locationId, assignedTo, directorate, department,
    isShared, search,
    page = '1', limit = '50',
  } = req.query;

  const userGroups = req.user.groups || [];
  const isAdmin = req.user.role === 'admin' || userGroups.includes('int_bislem');

  const where = { active: true };

  // Rol bazlı kısıtlama — admin/int_bislem hepsini görebilir
  if (!isAdmin && req.user.directorate) {
    where.directorate = req.user.directorate;
  }

  if (type)        where.type       = type;
  if (status)      where.status     = status;
  if (locationId)  where.locationId = parseInt(locationId);
  if (assignedTo)  where.assignedTo = assignedTo === 'me' ? req.user.username : assignedTo;
  // directorate filtresi: hem device.directorate hem assignedUser.directorate'e bak
  if (directorate && (isAdmin || directorate === req.user.directorate)) {
    where.OR = [
      { directorate: directorate },
      { directorate: null, assignedTo: { not: null }, assignedUser: { directorate: directorate } },
    ];
  }
  if (department)  where.department  = department;
  if (isShared !== undefined) where.isShared = isShared === 'true';

  if (search) {
    where.OR = [
      { name:         { contains: search, mode: 'insensitive' } },
      { brand:        { contains: search, mode: 'insensitive' } },
      { model:        { contains: search, mode: 'insensitive' } },
      { serialNumber: { contains: search, mode: 'insensitive' } },
      { ipAddress:    { contains: search, mode: 'insensitive' } },
      { macAddress:   { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const [devices, total] = await Promise.all([
      prisma.device.findMany({
        where,
        include: {
          location:     { select: { id: true, name: true, city: true } },
          assignedUser: { select: { id: true, username: true, displayName: true, department: true } },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        skip,
        take: parseInt(limit),
      }),
      prisma.device.count({ where }),
    ]);

    res.json({ devices, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cihazlar alınamadı' });
  }
});

// ─── GET /api/inventory/:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        location:     { select: { id: true, name: true, address: true, city: true } },
        assignedUser: { select: { id: true, username: true, displayName: true, department: true, directorate: true } },
      },
    });
    if (!device) return res.status(404).json({ error: 'Cihaz bulunamadı' });
    res.json(device);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cihaz alınamadı' });
  }
});

// ─── POST /api/inventory ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const {
    name, type, brand, model, serialNumber, ipAddress, macAddress,
    purchaseDate, warrantyEnd, status = 'ACTIVE',
    isShared = false, locationId, assignedTo,
    directorate, department, notes,
  } = req.body;

  if (!name?.trim()) return res.status(400).json({ error: 'Cihaz adı zorunlu' });
  if (!VALID_TYPES.includes(type))
    return res.status(400).json({ error: 'Geçersiz cihaz tipi' });
  if (!VALID_STATUSES.includes(status))
    return res.status(400).json({ error: 'Geçersiz durum' });

  try {
    const device = await prisma.device.create({
      data: {
        name:         name.trim(),
        type,
        brand:        brand?.trim()        || null,
        model:        model?.trim()        || null,
        serialNumber: serialNumber?.trim() || null,
        ipAddress:    ipAddress?.trim()    || null,
        macAddress:   macAddress?.trim()   || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        warrantyEnd:  warrantyEnd  ? new Date(warrantyEnd)  : null,
        status,
        isShared:    Boolean(isShared),
        locationId:   locationId   ? parseInt(locationId)   : null,
        assignedTo:   assignedTo?.trim() || null,
        directorate:  directorate?.trim() || null,
        department:   department?.trim()  || null,
        notes:        notes?.trim()       || null,
      },
      include: {
        location:     { select: { id: true, name: true } },
        assignedUser: { select: { id: true, username: true, displayName: true } },
      },
    });
    res.status(201).json(device);
  } catch (err) {
    if (err.code === 'P2003') return res.status(400).json({ error: 'Geçersiz lokasyon veya kullanıcı' });
    console.error(err);
    res.status(500).json({ error: 'Cihaz oluşturulamadı' });
  }
});

// ─── PATCH /api/inventory/:id ─────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  const {
    name, type, brand, model, serialNumber, ipAddress, macAddress,
    purchaseDate, warrantyEnd, status, isShared, locationId, assignedTo,
    directorate, department, notes,
  } = req.body;

  const data = {};
  if (name         !== undefined) data.name         = name.trim();
  if (type         !== undefined) {
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Geçersiz cihaz tipi' });
    data.type = type;
  }
  if (status       !== undefined) {
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Geçersiz durum' });
    data.status = status;
  }
  if (brand        !== undefined) data.brand        = brand?.trim()        || null;
  if (model        !== undefined) data.model        = model?.trim()        || null;
  if (serialNumber !== undefined) data.serialNumber = serialNumber?.trim() || null;
  if (ipAddress    !== undefined) data.ipAddress    = ipAddress?.trim()    || null;
  if (macAddress   !== undefined) data.macAddress   = macAddress?.trim()   || null;
  if (purchaseDate !== undefined) data.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
  if (warrantyEnd  !== undefined) data.warrantyEnd  = warrantyEnd  ? new Date(warrantyEnd)  : null;
  if (isShared     !== undefined) data.isShared     = Boolean(isShared);
  if (locationId   !== undefined) data.locationId   = locationId   ? parseInt(locationId)   : null;
  if (assignedTo   !== undefined) data.assignedTo   = assignedTo?.trim() || null;
  if (directorate  !== undefined) data.directorate  = directorate?.trim() || null;
  if (department   !== undefined) data.department   = department?.trim()  || null;
  if (notes        !== undefined) data.notes        = notes?.trim()       || null;

  try {
    const device = await prisma.device.update({
      where: { id },
      data,
      include: {
        location:     { select: { id: true, name: true } },
        assignedUser: { select: { id: true, username: true, displayName: true } },
      },
    });
    res.json(device);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cihaz bulunamadı' });
    if (err.code === 'P2003') return res.status(400).json({ error: 'Geçersiz lokasyon veya kullanıcı' });
    console.error(err);
    res.status(500).json({ error: 'Cihaz güncellenemedi' });
  }
});

// ─── DELETE /api/inventory/:id ────────────────────────────────────────────────
// ─── POST /api/inventory/sync-ad ─────────────────────────────────────────────
router.post('/sync-ad', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  // 30sn timeout ile sarmal
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('AD senkronizasyonu zaman aşımına uğradı (120s)')), 120_000)
  );

  try {
    const result = await Promise.race([
      syncDevicesFromAD(prisma, req.user.username),
      timeout,
    ]);
    res.json(result);
  } catch (err) {
    console.error('[sync-ad]', err);
    res.status(500).json({ error: err.message || 'Senkronizasyon başarısız' });
  }
});

// ─── GET /api/inventory/sync-logs ────────────────────────────────────────────
router.get('/sync-logs', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const { deviceName, from, to, limit = '100' } = req.query;
  const where = {};

  if (deviceName) {
    where.device = { name: { contains: deviceName, mode: 'insensitive' } };
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to)   where.createdAt.lte = new Date(to);
  }

  try {
    const logs = await prisma.deviceChangeLog.findMany({
      where,
      include: { device: { select: { id: true, name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
      take:    parseInt(limit),
    });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Loglar alınamadı' });
  }
});

// ─── DELETE /api/inventory/:id ────────────────────────────────────────────────
// Gerçek silme yok — pasife al
router.delete('/:id', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  try {
    const device = await prisma.device.update({
      where: { id },
      data:  { active: false, status: 'PASSIVE' },
    });
    res.json({ ok: true, device });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cihaz bulunamadı' });
    console.error(err);
    res.status(500).json({ error: 'Cihaz pasife alınamadı' });
  }
});

module.exports = router;
