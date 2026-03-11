const express  = require('express');
const router   = express.Router();
const prisma   = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

const VALID_TYPES = ['BILGISAYAR', 'YAZICI', 'TELEFON', 'MONITOR', 'UPS', 'DIGER'];

// ─── GET /api/devices ─────────────────────────────────────────────────────────
// Cihazları listele (username filtresi opsiyonel)
router.get('/', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const { username, active } = req.query;
  const where = {};
  if (username) where.username = username;
  if (active !== undefined) where.active = active === 'true';

  try {
    const devices = await prisma.userDevice.findMany({
      where,
      orderBy: [{ username: 'asc' }, { assignedAt: 'desc' }],
    });
    res.json(devices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cihazlar alınamadı' });
  }
});

// ─── POST /api/devices ────────────────────────────────────────────────────────
// Yeni cihaz ekle
router.post('/', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const { username, deviceName, deviceType = 'DIGER', serialNumber } = req.body;
  if (!username?.trim())   return res.status(400).json({ error: 'Kullanıcı adı zorunlu' });
  if (!deviceName?.trim()) return res.status(400).json({ error: 'Cihaz adı zorunlu' });
  if (!VALID_TYPES.includes(deviceType))
    return res.status(400).json({ error: 'Geçersiz cihaz tipi' });

  try {
    const device = await prisma.userDevice.create({
      data: {
        username:    username.trim().toLowerCase(),
        deviceName:  deviceName.trim(),
        deviceType,
        serialNumber: serialNumber?.trim() || null,
      },
    });
    res.status(201).json(device);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cihaz eklenemedi' });
  }
});

// ─── PATCH /api/devices/:id ───────────────────────────────────────────────────
// Cihaz güncelle
router.patch('/:id', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  const { deviceName, deviceType, serialNumber, active } = req.body;
  const data = {};
  if (deviceName   !== undefined) data.deviceName   = deviceName.trim();
  if (deviceType   !== undefined) {
    if (!VALID_TYPES.includes(deviceType))
      return res.status(400).json({ error: 'Geçersiz cihaz tipi' });
    data.deviceType = deviceType;
  }
  if (serialNumber !== undefined) data.serialNumber = serialNumber?.trim() || null;
  if (active       !== undefined) data.active       = Boolean(active);

  try {
    const device = await prisma.userDevice.update({ where: { id }, data });
    res.json(device);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cihaz bulunamadı' });
    res.status(500).json({ error: 'Cihaz güncellenemedi' });
  }
});

// ─── DELETE /api/devices/:id ──────────────────────────────────────────────────
// Cihaz sil (sadece admin)
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Sadece adminler silebilir' });

  const id = parseInt(req.params.id);
  try {
    await prisma.userDevice.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cihaz bulunamadı' });
    res.status(500).json({ error: 'Cihaz silinemedi' });
  }
});

module.exports = router;
