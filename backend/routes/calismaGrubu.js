const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

function yetkiKontrol(req, res, next) {
  const rol = req.user.sistemRol || req.user.role;
  if (!['admin', 'daire_baskani', 'mudur'].includes(rol))
    return res.status(403).json({ error: 'Yetersiz yetki' });
  next();
}

function liderYetkiKontrol(req, res, next) {
  const rol = req.user.sistemRol || req.user.role;
  if (!['admin', 'daire_baskani', 'mudur', 'sef'].includes(rol))
    return res.status(403).json({ error: 'Yetersiz yetki' });
  next();
}

// GET /api/calisma-grubu
router.get('/', auth, async (req, res) => {
  try {
    const rol = req.user.sistemRol || req.user.role;
    const filter = rol === 'admin' ? {} : {
      OR: [
        { directorate: req.user.directorate },
        { uyeler: { some: { username: req.user.username } } },
      ],
    };
    const gruplar = await prisma.calismaGrubu.findMany({
      where: { aktif: true, ...filter },
      include: { uyeler: true, _count: { select: { uyeler: true } } },
      orderBy: { olusturmaTarih: 'desc' },
    });
    res.json(gruplar);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/calisma-grubu
router.post('/', auth, yetkiKontrol, async (req, res) => {
  try {
    const { ad, aciklama, directorate, department, uyeler } = req.body;
    const grup = await prisma.calismaGrubu.create({
      data: {
        ad, aciklama,
        directorate: directorate || req.user.directorate || '',
        department: department || req.user.department,
        olusturan: req.user.username,
        uyeler: uyeler?.length ? {
          create: uyeler.map(u => ({
            username: u.username,
            displayName: u.displayName,
            rol: u.rol || 'uye',
          })),
        } : undefined,
      },
      include: { uyeler: true },
    });
    res.json(grup);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/calisma-grubu/:id
router.put('/:id', auth, yetkiKontrol, async (req, res) => {
  try {
    const { ad, aciklama, lider, liderAd } = req.body;
    const grup = await prisma.calismaGrubu.update({
      where: { id: parseInt(req.params.id) },
      data: { ad, aciklama, lider, liderAd },
    });
    res.json(grup);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/calisma-grubu/:id — pasife al
router.delete('/:id', auth, yetkiKontrol, async (req, res) => {
  try {
    await prisma.calismaGrubu.update({
      where: { id: parseInt(req.params.id) },
      data: { aktif: false },
    });
    res.json({ ok: true });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/calisma-grubu/:id/uye
router.post('/:id/uye', auth, yetkiKontrol, async (req, res) => {
  try {
    const { username, displayName, rol } = req.body;
    const uye = await prisma.calismaGrubuUye.upsert({
      where: { grubuId_username: { grubuId: parseInt(req.params.id), username } },
      create: { grubuId: parseInt(req.params.id), username, displayName, rol: rol || 'uye' },
      update: { rol: rol || 'uye', displayName },
    });
    res.json(uye);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/calisma-grubu/:id/uye/:username
router.delete('/:id/uye/:username', auth, yetkiKontrol, async (req, res) => {
  try {
    await prisma.calismaGrubuUye.delete({
      where: { grubuId_username: { grubuId: parseInt(req.params.id), username: req.params.username } },
    });
    res.json({ ok: true });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/calisma-grubu/:id/lider
router.put('/:id/lider', auth, yetkiKontrol, async (req, res) => {
  try {
    const { username, displayName } = req.body;
    const grubuId = parseInt(req.params.id);

    await prisma.calismaGrubuUye.updateMany({
      where: { grubuId, rol: 'lider' },
      data: { rol: 'uye' },
    });
    await prisma.calismaGrubuUye.upsert({
      where: { grubuId_username: { grubuId, username } },
      create: { grubuId, username, displayName, rol: 'lider' },
      update: { rol: 'lider', displayName },
    });
    await prisma.calismaGrubu.update({
      where: { id: grubuId },
      data: { lider: username, liderAd: displayName },
    });
    res.json({ ok: true });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/calisma-grubu/:id/gorevler
router.get('/:id/gorevler', auth, liderYetkiKontrol, async (req, res) => {
  try {
    const grubuId = parseInt(req.params.id);
    const grup = await prisma.calismaGrubu.findUnique({
      where: { id: grubuId },
      include: { uyeler: true },
    });
    if (!grup) return res.status(404).json({ error: 'Grup bulunamadı' });

    const rol = req.user.sistemRol || req.user.role;
    const isLider = grup.lider === req.user.username;
    if (!['admin', 'daire_baskani', 'mudur'].includes(rol) && !isLider)
      return res.status(403).json({ error: 'Yetersiz yetki' });

    const uyeKullanicilar = grup.uyeler.map(u => u.username);
    const gorevler = await prisma.ticket.findMany({
      where: {
        assignedTo: { username: { in: uyeKullanicilar } },
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
      },
      include: { assignedTo: true, createdBy: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(gorevler);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/calisma-grubu/gorev/:ticketId/ata
router.put('/gorev/:ticketId/ata', auth, liderYetkiKontrol, async (req, res) => {
  try {
    const { yeniAtanan } = req.body;
    const atanacak = await prisma.user.findFirst({ where: { username: yeniAtanan } });
    if (!atanacak) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    const ticket = await prisma.ticket.update({
      where: { id: parseInt(req.params.ticketId) },
      data: { assignedToId: atanacak.id, status: 'ASSIGNED' },
    });
    res.json(ticket);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
