const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const prisma  = require('../lib/prisma');
const {
  checkMuhtarlikAccess,
  requireMuhtarlikRole,
  getMuhtarlikRole,
  ROL_SEVIYE,
  ROL_ETIKET,
} = require('../middleware/muhtarlikAuth');

const VALID_ROLES = ['admin', 'daire_baskani', 'mudur', 'personel', 'user'];

// Tüm route'lara auth + erişim kontrolü
router.use(auth, checkMuhtarlikAccess);

// GET /api/muhtarbis/admin/roller — yetkili kullanıcıları listele (müdür+)
router.get('/roller', requireMuhtarlikRole('mudur'), async (req, res) => {
  try {
    const roller = await prisma.muhtarlikRole.findMany({
      orderBy: [{ active: 'desc' }, { username: 'asc' }],
    });
    res.json(roller.map(r => ({ ...r, rolEtiket: ROL_ETIKET[r.role] || r.role })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/muhtarbis/admin/roller/:username — ekle/güncelle (müdür+)
router.put('/roller/:username', requireMuhtarlikRole('mudur'), async (req, res) => {
  const { username } = req.params;
  const { role, displayName, directorate, department, active } = req.body;

  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Geçersiz rol. Geçerli roller: ${VALID_ROLES.join(', ')}` });
  }

  // admin rolü sadece admin verebilir
  if (role === 'admin' && req.user.muhtarlikRoleLevel < ROL_SEVIYE.admin) {
    return res.status(403).json({ error: 'Admin rolünü sadece admin kullanıcılar atayabilir' });
  }

  try {
    const record = await prisma.muhtarlikRole.upsert({
      where: { username },
      create: {
        username,
        displayName: displayName || username,
        role: role || 'user',
        directorate: directorate || null,
        department: department || null,
        active: active !== undefined ? active : true,
        updatedBy: req.user.username,
      },
      update: {
        ...(role        !== undefined && { role }),
        ...(displayName !== undefined && { displayName }),
        ...(directorate !== undefined && { directorate }),
        ...(department  !== undefined && { department }),
        ...(active      !== undefined && { active }),
        updatedBy: req.user.username,
      },
    });
    res.json({ ...record, rolEtiket: ROL_ETIKET[record.role] || record.role });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/muhtarbis/admin/roller/:username — pasifleştir (müdür+)
router.delete('/roller/:username', requireMuhtarlikRole('mudur'), async (req, res) => {
  const { username } = req.params;

  // Kendi kendini pasifleştirme engeli
  if (username === req.user.username) {
    return res.status(400).json({ error: 'Kendi yetkilerinizi kaldıramazsınız' });
  }

  try {
    await prisma.muhtarlikRole.update({
      where: { username },
      data: { active: false, updatedBy: req.user.username },
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/muhtarbis/admin/daire-personel — AD'den personel listesi (müdür+)
router.get('/daire-personel', requireMuhtarlikRole('mudur'), async (req, res) => {
  try {
    const daire = req.query.daire || '';
    const where = daire
      ? { directorate: { contains: daire, mode: 'insensitive' } }
      : {};

    const personel = await prisma.user.findMany({
      where,
      select: { username: true, displayName: true, title: true, department: true, directorate: true },
      orderBy: { displayName: 'asc' },
      take: 200,
    });
    res.json(personel);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/muhtarbis/auth/my-role — kendi rolünü öğren (sadece auth gerekli)
router.get('/my-role', async (req, res) => {
  const username = req.user?.username;
  const role = await getMuhtarlikRole(username);
  res.json({
    username,
    role: role || null,
    roleLabel: ROL_ETIKET[role] || null,
    roleLevel: ROL_SEVIYE[role] || 0,
    hasAccess: !!role,
  });
});

module.exports = router;
