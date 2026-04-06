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

// Daire başkanı + admin + müdür = tüm ilçelere erişim (yetki atama hariç)
const TAM_ERISIM_ROLLER = ['admin', 'daire_baskani', 'mudur'];

async function getMuhtarlikRole(username) {
  try {
    const r = await prisma.muhtarlikRole.findUnique({ where: { username } });
    if (!r || !r.active) return null;
    return r.role;
  } catch { return null; }
}

// Kullanıcının yetkili ilçelerini döndürür.
// Daire başkanı/admin → null (sınırsız erişim)
// Diğerleri → { ilceler: [...], yetkiMap: { BODRUM: 'tam', ... } }
async function getMuhtarlikIlceYetki(username, muhtarlikRole) {
  const sistemRol = muhtarlikRole;
  if (TAM_ERISIM_ROLLER.includes(sistemRol)) return null; // sınırsız

  try {
    const yetkiler = await prisma.muhtarlikYetki.findMany({
      where: { username, active: true },
    });
    const ilceler  = yetkiler.map(y => y.ilce);
    const yetkiMap = Object.fromEntries(yetkiler.map(y => [y.ilce, y.yetkiTuru]));
    return { ilceler, yetkiMap };
  } catch { return { ilceler: [], yetkiMap: {} }; }
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

  req.user.muhtarlikRole      = role;
  req.user.muhtarlikRoleLevel = ROL_SEVIYE[role] || 1;

  // İlçe yetki bilgisini yükle
  const ilceYetki = await getMuhtarlikIlceYetki(username, role);
  req.user.muhtarlikTamErisim = ilceYetki === null; // daire_baskani/admin
  req.user.muhtarlikIlceler   = ilceYetki?.ilceler || [];
  req.user.muhtarlikYetkiMap  = ilceYetki?.yetkiMap || {};

  next();
}

// İlçe erişim kontrolü — route'larda kullanılır
// İlçe parametresi yoksa (genel listeler) req.user.muhtarlikIlceler filtreye eklenir
function filterIlce(req, ilceParam) {
  if (req.user.muhtarlikTamErisim) return ilceParam || null; // sınırsız
  const yetkiliIlceler = req.user.muhtarlikIlceler;
  if (!yetkiliIlceler.length) return false; // hiç yetki yok → engelle
  if (ilceParam) {
    // Belirli bir ilçe isteniyor — yetkili mi?
    return yetkiliIlceler.includes(ilceParam) ? ilceParam : false;
  }
  return yetkiliIlceler; // tüm yetkili ilçeler
}

// Yazma yetkisi kontrolü
function checkYazmaYetkisi(req, ilce) {
  if (req.user.muhtarlikTamErisim) return true;
  const yetki = req.user.muhtarlikYetkiMap[ilce];
  return yetki === 'yazma' || yetki === 'tam';
}

function requireMuhtarlikRole(minRole) {
  return async (req, res, next) => {
    const role  = req.user?.muhtarlikRole || await getMuhtarlikRole(req.user?.username);
    const level = ROL_SEVIYE[role] || 0;
    if (level >= ROL_SEVIYE[minRole]) return next();
    return res.status(403).json({
      error: 'Yetersiz yetki',
      required: ROL_ETIKET[minRole],
      current:  ROL_ETIKET[role] || 'Yok',
    });
  };
}

module.exports = {
  checkMuhtarlikAccess,
  requireMuhtarlikRole,
  getMuhtarlikRole,
  getMuhtarlikIlceYetki,
  filterIlce,
  checkYazmaYetkisi,
  ROL_SEVIYE,
  ROL_ETIKET,
};
