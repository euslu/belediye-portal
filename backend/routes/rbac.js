const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const prisma = require('../lib/prisma');

function adminOnly(req, res, next) {
  const rol = req.user.sistemRol || req.user.role;
  if (rol !== 'admin') return res.status(403).json({ error: 'Sadece admin erişebilir' });
  next();
}

function adminOrDaireBaskani(req, res, next) {
  const rol = req.user.sistemRol || req.user.role;
  if (!['admin', 'daire_baskani'].includes(rol))
    return res.status(403).json({ error: 'Yetersiz yetki' });
  next();
}

// GET /api/rbac/kullanicilar
router.get('/kullanicilar', auth, adminOrDaireBaskani, async (req, res) => {
  try {
    const rol        = req.user.sistemRol || req.user.role;
    const dairesi    = rol === 'daire_baskani' ? req.user.directorate : null;
    const userFilter = dairesi ? { directorate: dairesi } : {};

    const [userRoles, tumKullanicilar] = await Promise.all([
      prisma.userRole.findMany({ orderBy: { directorate: 'asc' } }),
      prisma.user.findMany({
        where: userFilter,
        select: {
          username: true, displayName: true,
          directorate: true, department: true, title: true,
          role: true,
        },
        orderBy: [{ directorate: 'asc' }, { displayName: 'asc' }],
      }),
    ]);

    const rolMap = Object.fromEntries(userRoles.map(r => [r.username, r]));

    const rolFallback = (u) => {
      if (u.role === 'admin') return 'admin';
      if (u.role === 'manager') return 'mudur';
      const t = (u.title || '').toLowerCase();
      if (t.includes('daire başkanı') || t.includes('daire baskani') || t.includes('başkan')) return 'daire_baskani';
      if (t.includes('müdür') || t.includes('mudur')) return 'mudur';
      if (t.includes('şef') || t.includes('sef')) return 'sef';
      return 'personel';
    };

    const liste = tumKullanicilar.map(u => ({
      username:    u.username,
      displayName: u.displayName,
      directorate: u.directorate,
      department:  u.department,
      title:       u.title,
      sistemRol:   rolMap[u.username]?.role || rolFallback(u),
      aktif:       rolMap[u.username]?.active ?? true,
      dbKaydi:     !!rolMap[u.username],
    }));

    res.json(liste);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/rbac/kullanici/:username
router.put('/kullanici/:username', auth, adminOrDaireBaskani, async (req, res) => {
  try {
    const { rol, aktif } = req.body;

    // Hedef kullanıcının displayName'ini User tablosundan al
    const hedef = await prisma.user.findFirst({
      where: { username: req.params.username },
      select: { displayName: true },
    });

    const updated = await prisma.userRole.upsert({
      where: { username: req.params.username },
      create: {
        username:    req.params.username,
        displayName: hedef?.displayName,
        role:        rol,
        active:      aktif ?? true,
        updatedBy:   req.user.username,
      },
      update: {
        role:      rol,
        active:    aktif ?? true,
        updatedBy: req.user.username,
      },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/rbac/gruplar
router.get('/gruplar', auth, adminOnly, async (req, res) => {
  try {
    const gruplar = await prisma.calismaGrubu.findMany({
      where: { aktif: true },
      include: { uyeler: true, _count: { select: { uyeler: true } } },
      orderBy: { directorate: 'asc' },
    });
    res.json(gruplar);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/rbac/directives — daire listesi (filtre için)
router.get('/directorates', auth, adminOnly, async (req, res) => {
  try {
    const rows = await prisma.user.findMany({
      where: { directorate: { not: null } },
      select: { directorate: true },
      distinct: ['directorate'],
      orderBy: { directorate: 'asc' },
    });
    res.json(rows.map(r => r.directorate).filter(Boolean));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
