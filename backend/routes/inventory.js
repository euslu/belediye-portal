const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const { getSistemRol } = require('../middleware/rbac');

router.use(authMiddleware);

const logger = require('../utils/logger');
const { fetchAdComputers, MOCK_COMPUTERS } = require('../lib/adComputers');
const { syncDevicesFromAD } = require('../lib/adDeviceSync');
const { matchOwner, runMatchAll, applySelectedMatches } = require('../services/deviceUserMatch');
const { logIslem } = require('../middleware/auditLog');
const multer = require('multer');
const XLSX = require('xlsx');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const VALID_TYPES = [
  'BILGISAYAR', 'DIZUSTU', 'IPAD_TABLET', 'IP_TELEFON', 'MONITOR',
  'YAZICI', 'SWITCH', 'ACCESS_POINT', 'SUNUCU', 'UPS', 'DIGER',
];
const VALID_STATUSES = ['ACTIVE', 'PASSIVE', 'BROKEN', 'TRANSFERRED'];

const DEVICE_ACCESS_INCLUDE = {
  assignedUser: { select: { username: true, displayName: true, directorate: true, department: true } },
};

function getEffectiveDeviceDirectorate(device) {
  return device?.directorate || device?.assignedUser?.directorate || null;
}

function getEffectiveDeviceDepartment(device) {
  return device?.department || device?.assignedUser?.department || null;
}

function canAccessDevice(user, device) {
  const rol = getSistemRol(user);
  const deviceDirectorate = getEffectiveDeviceDirectorate(device);
  const deviceDepartment = getEffectiveDeviceDepartment(device);

  if (rol === 'admin') return true;

  if (rol === 'daire_baskani') {
    if (!user.directorate) return false;
    return deviceDirectorate === user.directorate;
  }

  if (rol === 'mudur') {
    if (user.department && deviceDepartment === user.department) return true;
    if (user.directorate && !deviceDepartment && deviceDirectorate === user.directorate) return true;
    return false;
  }

  return device?.assignedTo === user.username;
}

async function getDeviceAccessContext(id) {
  return prisma.device.findUnique({
    where: { id },
    include: DEVICE_ACCESS_INCLUDE,
  });
}

async function requireDeviceScopeAccess(id, user) {
  const device = await getDeviceAccessContext(id);
  if (!device) return { error: 'not_found' };
  if (!canAccessDevice(user, device)) return { error: 'forbidden' };
  return { device };
}

async function requireLicenseScopeAccess(licenseId, user) {
  const license = await prisma.deviceLicense.findUnique({
    where: { id: licenseId },
    include: {
      device: {
        include: DEVICE_ACCESS_INCLUDE,
      },
    },
  });

  if (!license) return { error: 'not_found' };
  if (!license.device) return { error: 'device_not_found' };
  if (!canAccessDevice(user, license.device)) return { error: 'forbidden' };
  return { license, device: license.device };
}

// ─── GET /api/inventory/ad-computers ─────────────────────────────────────────
// AD'deki bilgisayar nesnelerini çeker, DB ile karşılaştırır
router.get('/ad-computers', async (req, res) => {
  if (!['admin', 'manager', 'daire_baskani', 'mudur'].includes(req.user.sistemRol || req.user.role))
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
    logger.error(err);
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
    logger.error(err);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

// ─── GET /api/inventory/directorates ─────────────────────────────────────────
// Her zaman User tablosundan çeker (cihazlar henüz daire bilgisi olmayabilir)
router.get('/directorates', async (req, res) => {
  try {
    const userGroups = req.user.groups || [];
    const isAdmin = req.user.role === 'admin' || userGroups.includes('int_bislem');

    const userWhere = { directorate: { not: null } };
    if (!isAdmin && req.user.directorate) {
      userWhere.directorate = req.user.directorate;
    }

    const rows = await prisma.user.findMany({
      where:    userWhere,
      select:   { directorate: true },
      distinct: ['directorate'],
    });

    const list = rows.map((r) => r.directorate).filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'));
    res.json(list);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Daireler alınamadı' });
  }
});

// ─── GET /api/inventory/by-directorate ───────────────────────────────────────
router.get('/by-directorate', async (req, res) => {
  try {
    const counts = await prisma.$queryRaw`
      SELECT
        COALESCE(d.directorate, u.directorate, 'Atanmamış') AS directorate,
        COUNT(*)::int                                                          AS total,
        COUNT(CASE WHEN d.type = 'BILGISAYAR' THEN 1 END)::int               AS bilgisayar,
        COUNT(CASE WHEN d.type = 'DIZUSTU'    THEN 1 END)::int               AS dizustu,
        COUNT(CASE WHEN d.type = 'IP_TELEFON' THEN 1 END)::int               AS ip_telefon,
        COUNT(CASE WHEN d.type = 'YAZICI'     THEN 1 END)::int               AS yazici,
        COUNT(CASE WHEN d.type NOT IN ('BILGISAYAR','DIZUSTU','IP_TELEFON','YAZICI') THEN 1 END)::int AS diger,
        COUNT(CASE WHEN d."lastSyncAt" > NOW() - INTERVAL '1 day'  THEN 1 END)::int AS online,
        COUNT(CASE WHEN d."lastSyncAt" IS NULL                      THEN 1 END)::int AS unknown_epc
      FROM "Device" d
      LEFT JOIN "User" u ON LOWER(d."assignedTo") = LOWER(u.username)
      WHERE d.active = true
      GROUP BY COALESCE(d.directorate, u.directorate, 'Atanmamış')
      ORDER BY total DESC
    `;
    res.json(counts.map(c => ({
      directorate: c.directorate,
      total:      Number(c.total),
      bilgisayar: Number(c.bilgisayar),
      dizustu:    Number(c.dizustu),
      ip_telefon: Number(c.ip_telefon),
      yazici:     Number(c.yazici),
      diger:      Number(c.diger),
      online:     Number(c.online),
      unknownEpc: Number(c.unknown_epc),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/inventory/license-management ───────────────────────────────────
// Lisans yönetimi sayfası: assignedTo olan cihazları lisanslarıyla getir
router.get('/license-management', async (req, res) => {
  try {
    const { search, sayfa = 1, limit = 30 } = req.query;
    const pg = Math.max(1, +sayfa);
    const lm = Math.min(100, Math.max(1, +limit));

    const where = {
      active: true,
      type: { in: ['BILGISAYAR', 'DIZUSTU'] },
      OR: [
        { assignedTo: { not: null } },
        { userDevices: { some: { active: true } } },
      ],
    };

    if (search?.trim()) {
      const s = search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: s, mode: 'insensitive' } },
            { assignedTo: { contains: s, mode: 'insensitive' } },
            { directorate: { contains: s, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [toplam, devices] = await Promise.all([
      prisma.device.count({ where }),
      prisma.device.findMany({
        where,
        select: {
          id: true, name: true, type: true, assignedTo: true,
          directorate: true, department: true,
          licenses: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: [{ assignedTo: 'asc' }, { name: 'asc' }],
        skip: (pg - 1) * lm,
        take: lm,
      }),
    ]);

    res.json({ devices, toplam, sayfa: pg, toplamSayfa: Math.ceil(toplam / lm) });
  } catch (err) {
    logger.error('[license-management]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/inventory/license-records ────────────────────────────────────────
// Kalıcı lisans kayıtları — eşleşme bağımsız snapshot tablosu
router.get('/license-records', async (req, res) => {
  try {
    const { search, sayfa = 1, limit = 30, showInactive } = req.query;
    const pg = Math.max(1, +sayfa);
    const lm = Math.min(100, Math.max(1, +limit));

    const where = showInactive === 'true' ? {} : { active: true };

    if (search?.trim()) {
      const s = search.trim();
      where.OR = [
        { deviceName: { contains: s, mode: 'insensitive' } },
        { username: { contains: s, mode: 'insensitive' } },
        { directorate: { contains: s, mode: 'insensitive' } },
        { licenseName: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [toplam, records] = await Promise.all([
      prisma.licenseRecord.count({ where }),
      prisma.licenseRecord.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (pg - 1) * lm,
        take: lm,
      }),
    ]);

    res.json({ records, toplam, sayfa: pg, toplamSayfa: Math.ceil(toplam / lm) });
  } catch (err) {
    logger.error('[license-records]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/inventory/match-preview ─────────────────────────────────────────
// EPC owner → Portal user eşleştirme önizlemesi (dry run)
router.get('/match-preview', async (req, res) => {
  const rol = req.user.sistemRol || req.user.role;
  if (!['admin', 'manager', 'daire_baskani', 'mudur'].includes(rol))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  try {
    const sonuc = await runMatchAll({ dryRun: true });
    // Sadece eşleşen + birim eşleşenleri döndür (önce yüksek confidence)
    sonuc.detay = sonuc.detay
      .filter(d => d.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, parseInt(req.query.limit || '100'));
    res.json(sonuc);
  } catch (err) {
    logger.error('[match-preview]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/inventory/match-run ───────────────────────────────────────────
// EPC owner → Portal user eşleştirmesini uygula (gerçek güncelleme) — eski uyumluluk
router.post('/match-run', async (req, res) => {
  if (!['admin'].includes(req.user.sistemRol || req.user.role))
    return res.status(403).json({ error: 'Sadece admin' });

  try {
    const sonuc = await runMatchAll({ dryRun: false });
    sonuc.detay = sonuc.detay
      .filter(d => d.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence);
    logIslem({ kullanici: req.user.username, kullaniciAd: req.user.displayName, islem: 'MATCH_RUN', modul: 'inventory', detay: { matched: sonuc.detay.length }, ip: req.ip });
    res.json(sonuc);
  } catch (err) {
    logger.error('[match-run]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/inventory/match-apply ────────────────────────────────────────
// Seçili eşleştirmeleri uygula — [{cihazId, username}]
router.post('/match-apply', async (req, res) => {
  if (!['admin'].includes(req.user.sistemRol || req.user.role))
    return res.status(403).json({ error: 'Sadece admin' });

  const { matches } = req.body;
  if (!Array.isArray(matches) || matches.length === 0)
    return res.status(400).json({ error: 'En az bir eşleştirme seçilmeli' });

  try {
    const result = await applySelectedMatches(matches);
    logIslem({ kullanici: req.user.username, kullaniciAd: req.user.displayName, islem: 'MATCH_RUN', modul: 'inventory', detay: { applied: result.applied, total: matches.length }, ip: req.ip });
    res.json(result);
  } catch (err) {
    logger.error('[match-apply]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/inventory/licenses/:licenseId ───────────────────────────────
router.delete('/licenses/:licenseId', async (req, res) => {
  if (!['admin', 'manager', 'daire_baskani', 'mudur'].includes(req.user.sistemRol || req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const licenseId = parseInt(req.params.licenseId);
  try {
    const scope = await requireLicenseScopeAccess(licenseId, req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'Lisans bulunamadı' });
    if (scope.error === 'forbidden') return res.status(403).json({ error: 'Bu lisans üzerinde işlem yetkiniz yok' });

    // LicenseRecord'da pasifleştir (snapshot korunur)
    await prisma.licenseRecord.updateMany({
      where: { deviceLicenseId: licenseId },
      data: { active: false },
    });

    await prisma.deviceLicense.delete({ where: { id: licenseId } });
    logIslem({ kullanici: req.user.username, kullaniciAd: req.user.displayName, islem: 'LICENSE_DELETE', modul: 'inventory', kayitId: licenseId, ip: req.ip });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Lisans bulunamadı' });
    logger.error(err);
    res.status(500).json({ error: 'Lisans silinemedi' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ─── YAZILIM KATALOĞU ENDPOINT'LERİ ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/inventory/software-catalog — Tüm katalog + kullanılan/kalan
router.get('/software-catalog', async (req, res) => {
  try {
    const catalog = await prisma.softwareCatalog.findMany({ orderBy: { name: 'asc' } });

    const usageCounts = await prisma.deviceLicense.groupBy({
      by: ['name'],
      _count: { name: true },
    });
    const usageMap = {};
    for (const u of usageCounts) usageMap[u.name] = u._count.name;

    const result = catalog.map(sw => {
      const usedCount = usageMap[sw.name] || 0;
      return {
        id: sw.id,
        name: sw.name,
        category: sw.category,
        totalLicenses: sw.totalLicenses,
        usedCount,
        remaining: sw.totalLicenses - usedCount,
      };
    });

    res.json(result);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Katalog alınamadı' });
  }
});

// POST /api/inventory/software-catalog/import — Excel'den toplu import
router.post('/software-catalog/import', upload.single('file'), async (req, res) => {
  if (!['admin', 'manager', 'daire_baskani', 'mudur'].includes(req.user.sistemRol || req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  if (!req.file) return res.status(400).json({ error: 'Dosya yüklenmedi' });

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    let created = 0, skipped = 0, errors = [];

    for (const row of rows) {
      const name = (row['Yazılım Adı'] || row['name'] || row['Name'] || row['YAZILIM'] || '').toString().trim();
      if (!name) continue;

      const category = (row['Kategori'] || row['category'] || row['Category'] || '').toString().trim() || null;
      const totalLicenses = parseInt(row['Toplam Lisans'] || row['totalLicenses'] || row['Total'] || 0) || 0;

      try {
        await prisma.softwareCatalog.upsert({
          where: { name },
          update: { category: category || undefined, totalLicenses },
          create: { name, category, totalLicenses },
        });
        created++;
      } catch (err) {
        skipped++;
        errors.push(name);
      }
    }

    res.json({ created, skipped, errors, total: rows.length });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Excel import başarısız' });
  }
});

// POST /api/inventory/software-catalog — Tekil yazılım ekle
router.post('/software-catalog', async (req, res) => {
  if (!['admin', 'manager', 'daire_baskani', 'mudur'].includes(req.user.sistemRol || req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const { name, category, totalLicenses } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Yazılım adı zorunlu' });

  try {
    const sw = await prisma.softwareCatalog.create({
      data: {
        name: name.trim(),
        category: category?.trim() || null,
        totalLicenses: parseInt(totalLicenses) || 0,
      },
    });
    res.status(201).json(sw);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Bu yazılım zaten katalogda' });
    logger.error(err);
    res.status(500).json({ error: 'Yazılım eklenemedi' });
  }
});

// PUT /api/inventory/software-catalog/:id — Güncelle
router.put('/software-catalog/:id', async (req, res) => {
  if (!['admin', 'manager', 'daire_baskani', 'mudur'].includes(req.user.sistemRol || req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  const { name, category, totalLicenses } = req.body;

  try {
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (category !== undefined) data.category = category?.trim() || null;
    if (totalLicenses !== undefined) data.totalLicenses = parseInt(totalLicenses) || 0;

    const sw = await prisma.softwareCatalog.update({ where: { id }, data });
    res.json(sw);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Yazılım bulunamadı' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Bu isimde yazılım zaten var' });
    logger.error(err);
    res.status(500).json({ error: 'Güncelleme başarısız' });
  }
});

// DELETE /api/inventory/software-catalog/:id — Sil
router.delete('/software-catalog/:id', async (req, res) => {
  if (!['admin', 'manager', 'daire_baskani', 'mudur'].includes(req.user.sistemRol || req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  try {
    await prisma.softwareCatalog.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Yazılım bulunamadı' });
    logger.error(err);
    res.status(500).json({ error: 'Silme başarısız' });
  }
});

// ─── POST /api/inventory/:id/assign ──────────────────────────────────────────
// Manuel kullanıcı atama
router.post('/:id/assign', async (req, res) => {
  if (!['admin', 'manager', 'daire_baskani', 'mudur'].includes(req.user.sistemRol || req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  const { username } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: 'Username zorunlu' });

  try {
    const scope = await requireDeviceScopeAccess(id, req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'Cihaz bulunamadı' });
    if (scope.error === 'forbidden') return res.status(403).json({ error: 'Bu cihaz üzerinde işlem yetkiniz yok' });

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      select: { username: true, displayName: true, directorate: true, department: true },
    });
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    const device = await prisma.device.update({
      where: { id },
      data: {
        assignedTo:  user.username,
        directorate: user.directorate,
        department:  user.department,
      },
    });

    // Kalıcı UserDevice kaydı
    await prisma.userDevice.upsert({
      where: { username_deviceName: { username: user.username, deviceName: device.name } },
      create: {
        username: user.username,
        deviceName: device.name,
        deviceId: device.id,
        deviceType: device.type || 'DIGER',
        serialNumber: device.serialNumber,
        active: true,
      },
      update: {
        deviceId: device.id,
        deviceType: device.type || 'DIGER',
        serialNumber: device.serialNumber,
        active: true,
      },
    });

    logIslem({ kullanici: req.user.username, kullaniciAd: req.user.displayName, islem: 'ASSIGN', modul: 'inventory', kayitId: id, detay: { assignedTo: user.username, displayName: user.displayName }, ip: req.ip });
    res.json({ ok: true, device, user });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cihaz bulunamadı' });
    logger.error(err);
    res.status(500).json({ error: 'Atama başarısız' });
  }
});

// ─── DELETE /api/inventory/:id/unassign ───────────────────────────────────────
// Kullanıcı atamasını kaldır
router.delete('/:id/unassign', async (req, res) => {
  if (!['admin', 'manager', 'daire_baskani', 'mudur'].includes(req.user.sistemRol || req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  try {
    const scope = await requireDeviceScopeAccess(id, req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'Cihaz bulunamadı' });
    if (scope.error === 'forbidden') return res.status(403).json({ error: 'Bu cihaz üzerinde işlem yetkiniz yok' });

    const device = scope.device;

    // UserDevice kaydını pasifleştir
    if (device.assignedTo && device.name) {
      await prisma.userDevice.updateMany({
        where: { username: device.assignedTo, deviceName: device.name, active: true },
        data: { active: false },
      });
    }

    const updated = await prisma.device.update({
      where: { id },
      data: { assignedTo: null, isShared: true },
    });

    logIslem({ kullanici: req.user.username, kullaniciAd: req.user.displayName, islem: 'UNASSIGN', modul: 'inventory', kayitId: id, detay: { previousAssignedTo: device.assignedTo }, ip: req.ip });
    res.json({ ok: true, device: updated });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Atama kaldırma başarısız' });
  }
});

// ─── GET /api/inventory ───────────────────────────────────────────────────────
// Raw SQL — Prisma ORM'nin LEFT JOIN + OR kısıtlamasını aşmak için
router.get('/', async (req, res) => {
  const { directorate, type, status, search, assignedTo, page = '1', limit = '50' } = req.query;

  const userGroups = req.user.groups || [];
  const isAdmin    = req.user.role === 'admin' || userGroups.includes('int_bislem');
  const roleDir    = !isAdmin && req.user.directorate ? req.user.directorate : null;
  const effDir     = directorate && (isAdmin || directorate === roleDir) ? directorate : roleDir;

  try {
    const params = [];
    let pi = 1;

    let base = `
      FROM "Device" d
      LEFT JOIN "User" u ON LOWER(d."assignedTo") = LOWER(u.username)
      WHERE d.active = true
    `;

    if (effDir === '__unassigned__') {
      base += ` AND d.directorate IS NULL AND d."assignedTo" IS NULL`;
    } else if (effDir) {
      base += ` AND (d.directorate = $${pi} OR (d.directorate IS NULL AND u.directorate = $${pi}))`;
      params.push(effDir); pi++;
    }

    if (type && VALID_TYPES.includes(type)) {
      base += ` AND d.type = $${pi}::"DeviceType"`;
      params.push(type); pi++;
    }

    if (status && VALID_STATUSES.includes(status)) {
      base += ` AND d.status = $${pi}::"DeviceStatus"`;
      params.push(status); pi++;
    }

    if (search) {
      const like = `%${search}%`;
      base += ` AND (d.name ILIKE $${pi} OR d."assignedTo" ILIKE $${pi} OR d."ipAddress" ILIKE $${pi} OR d."serialNumber" ILIKE $${pi} OR u."displayName" ILIKE $${pi})`;
      params.push(like); pi++;
    }

    if (assignedTo) {
      const assignedVal = assignedTo === 'me' ? req.user.username : assignedTo;
      base += ` AND LOWER(d."assignedTo") = $${pi}`;
      params.push(assignedVal.toLowerCase().trim()); pi++;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [countRows, devices] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count ${base}`, ...params),
      prisma.$queryRawUnsafe(
        `SELECT d.*,
                u."displayName"  AS "userName",
                u.directorate    AS "userDirectorate",
                u.department     AS "userDepartment"
         ${base}
         ORDER BY d.name ASC
         LIMIT $${pi} OFFSET $${pi + 1}`,
        ...params, parseInt(limit), skip,
      ),
    ]);

    const now = Date.now();
    const devicesWithEpc = devices.map(d => {
      const diff = d.lastSyncAt ? (now - new Date(d.lastSyncAt).getTime()) / 86400000 : null;
      const epcStatus = diff === null ? 'unknown' : diff < 1 ? 'online' : diff < 7 ? 'passive' : 'offline';
      return { ...d, epcStatus };
    });
    res.json({ devices: devicesWithEpc, total: countRows[0]?.count ?? 0, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    logger.error('Inventory GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/inventory/:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const scope = await requireDeviceScopeAccess(id, req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'Cihaz bulunamadı' });
    if (scope.error === 'forbidden') return res.status(403).json({ error: 'Bu cihaza erişim yetkiniz yok' });

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
    logger.error(err);
    res.status(500).json({ error: 'Cihaz alınamadı' });
  }
});

// ─── POST /api/inventory ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  if (!['admin', 'manager', 'daire_baskani', 'mudur'].includes(req.user.sistemRol || req.user.role))
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
    logIslem({ kullanici: req.user.username, kullaniciAd: req.user.displayName, islem: 'CREATE', modul: 'inventory', kayitId: device.id, detay: { name: name.trim(), type }, ip: req.ip });
    res.status(201).json(device);
  } catch (err) {
    if (err.code === 'P2003') return res.status(400).json({ error: 'Geçersiz lokasyon veya kullanıcı' });
    logger.error(err);
    res.status(500).json({ error: 'Cihaz oluşturulamadı' });
  }
});

// ─── PATCH /api/inventory/:id ─────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  if (!['admin', 'manager', 'daire_baskani', 'mudur'].includes(req.user.sistemRol || req.user.role))
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
    const scope = await requireDeviceScopeAccess(id, req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'Cihaz bulunamadı' });
    if (scope.error === 'forbidden') return res.status(403).json({ error: 'Bu cihaz üzerinde işlem yetkiniz yok' });

    const device = await prisma.device.update({
      where: { id },
      data,
      include: {
        location:     { select: { id: true, name: true } },
        assignedUser: { select: { id: true, username: true, displayName: true } },
      },
    });
    logIslem({ kullanici: req.user.username, kullaniciAd: req.user.displayName, islem: 'UPDATE', modul: 'inventory', kayitId: id, detay: Object.keys(data), ip: req.ip });
    res.json(device);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cihaz bulunamadı' });
    if (err.code === 'P2003') return res.status(400).json({ error: 'Geçersiz lokasyon veya kullanıcı' });
    logger.error(err);
    res.status(500).json({ error: 'Cihaz güncellenemedi' });
  }
});

// ─── DELETE /api/inventory/:id ────────────────────────────────────────────────
// ─── POST /api/inventory/sync-ad ─────────────────────────────────────────────
router.post('/sync-ad', async (req, res) => {
  if (!['admin', 'manager', 'daire_baskani', 'mudur'].includes(req.user.sistemRol || req.user.role))
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
    logger.error('[sync-ad]', err);
    res.status(500).json({ error: err.message || 'Senkronizasyon başarısız' });
  }
});

// ─── GET /api/inventory/sync-logs ────────────────────────────────────────────
router.get('/sync-logs', async (req, res) => {
  if (!['admin', 'manager', 'daire_baskani', 'mudur'].includes(req.user.sistemRol || req.user.role))
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
    logger.error(err);
    res.status(500).json({ error: 'Loglar alınamadı' });
  }
});

// ─── DELETE /api/inventory/:id ────────────────────────────────────────────────
// Gerçek silme yok — pasife al
router.delete('/:id', async (req, res) => {
  if (!['admin', 'manager', 'daire_baskani', 'mudur'].includes(req.user.sistemRol || req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  try {
    const scope = await requireDeviceScopeAccess(id, req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'Cihaz bulunamadı' });
    if (scope.error === 'forbidden') return res.status(403).json({ error: 'Bu cihaz üzerinde işlem yetkiniz yok' });

    const device = await prisma.device.update({
      where: { id },
      data:  { active: false, status: 'PASSIVE' },
    });
    logIslem({ kullanici: req.user.username, kullaniciAd: req.user.displayName, islem: 'DELETE', modul: 'inventory', kayitId: id, detay: { name: device.name }, ip: req.ip });
    res.json({ ok: true, device });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cihaz bulunamadı' });
    logger.error(err);
    res.status(500).json({ error: 'Cihaz pasife alınamadı' });
  }
});


// ─── GET /api/inventory/:id/licenses ─────────────────────────────────────────
router.get('/:id/licenses', async (req, res) => {
  const deviceId = parseInt(req.params.id);
  try {
    const scope = await requireDeviceScopeAccess(deviceId, req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'Cihaz bulunamadı' });
    if (scope.error === 'forbidden') return res.status(403).json({ error: 'Bu cihazın lisanslarına erişim yetkiniz yok' });

    const licenses = await prisma.deviceLicense.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(licenses);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Lisanslar alınamadı' });
  }
});

// ─── POST /api/inventory/:id/licenses ────────────────────────────────────────
router.post('/:id/licenses', async (req, res) => {
  if (!['admin', 'manager', 'daire_baskani', 'mudur'].includes(req.user.sistemRol || req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const deviceId = parseInt(req.params.id);
  const { name, key, baslangicTarihi, bitisTarihi, sinirsiz } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Lisans adı zorunlu' });

  try {
    const scope = await requireDeviceScopeAccess(deviceId, req.user);
    if (scope.error === 'not_found') return res.status(404).json({ error: 'Cihaz bulunamadı' });
    if (scope.error === 'forbidden') return res.status(403).json({ error: 'Bu cihaz için lisans ekleme yetkiniz yok' });

    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) return res.status(404).json({ error: 'Cihaz bulunamadı' });

    const license = await prisma.deviceLicense.create({
      data: {
        deviceId,
        name: name.trim(),
        key: key?.trim() || null,
        baslangicTarihi: baslangicTarihi ? new Date(baslangicTarihi) : null,
        bitisTarihi: sinirsiz ? null : (bitisTarihi ? new Date(bitisTarihi) : null),
        sinirsiz: !!sinirsiz,
        username: device.assignedTo || null,
        deviceName: device.name || null,
      },
    });

    // Kalıcı LicenseRecord snapshot
    await prisma.licenseRecord.create({
      data: {
        deviceLicenseId: license.id,
        deviceId,
        deviceName: device.name || 'Bilinmiyor',
        username: device.assignedTo || null,
        directorate: device.directorate || null,
        department: device.department || null,
        licenseName: name.trim(),
        licenseKey: key?.trim() || null,
        baslangicTarihi: baslangicTarihi ? new Date(baslangicTarihi) : null,
        bitisTarihi: sinirsiz ? null : (bitisTarihi ? new Date(bitisTarihi) : null),
        sinirsiz: !!sinirsiz,
      },
    });

    logIslem({ kullanici: req.user.username, kullaniciAd: req.user.displayName, islem: 'LICENSE_ADD', modul: 'inventory', kayitId: deviceId, detay: { licenseName: name.trim() }, ip: req.ip });
    res.status(201).json(license);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Lisans eklenemedi' });
  }
});

module.exports = router;
