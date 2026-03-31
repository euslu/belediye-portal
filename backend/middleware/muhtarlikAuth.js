const prisma = require('../lib/prisma');

const ROL_SEVIYE = {
  admin:         5,
  daire_baskani: 4,
  mudur:         3,
  personel:      2,
  user:          1,
};

const ROL_ETIKET = {
  admin:         'Admin',
  daire_baskani: 'Daire Başkanı',
  mudur:         'Müdür',
  personel:      'Personel',
  user:          'Kullanıcı',
};

async function getMuhtarlikRole(username) {
  try {
    const r = await prisma.muhtarlikRole.findUnique({ where: { username } });
    if (!r || !r.active) return null;
    return r.role;
  } catch { return null; }
}

async function checkMuhtarlikAccess(req, res, next) {
  const username = req.user?.username;
  if (!username) return res.status(401).json({ error: 'Kimlik doğrulaması gerekli' });

  const role = await getMuhtarlikRole(username);
  if (!role) {
    return res.status(403).json({
      error: 'ERİŞİM YETKİNİZ YOK',
      message: "Muhtarlıklar Bilgi Sistemi'ne erişim için yetkiniz bulunmamaktadır. Lütfen daire başkanlığınızla iletişime geçin.",
      code: 'MUHTARLIK_ACCESS_DENIED',
    });
  }

  req.user.muhtarlikRole = role;
  req.user.muhtarlikRoleLevel = ROL_SEVIYE[role] || 1;
  next();
}

function requireMuhtarlikRole(minRole) {
  return async (req, res, next) => {
    const role = req.user?.muhtarlikRole || await getMuhtarlikRole(req.user?.username);
    const level = ROL_SEVIYE[role] || 0;
    if (level >= ROL_SEVIYE[minRole]) return next();
    return res.status(403).json({
      error: 'Yetersiz yetki',
      required: ROL_ETIKET[minRole],
      current: ROL_ETIKET[role] || 'Yok',
    });
  };
}

module.exports = { checkMuhtarlikAccess, requireMuhtarlikRole, getMuhtarlikRole, ROL_SEVIYE, ROL_ETIKET };
