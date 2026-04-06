/**
 * RBAC Yardımcıları
 *
 * sistemRol hiyerarşisi (yüksekten düşüğe):
 *   admin > daire_baskani > mudur > sef > personel
 *
 * Mevcut User.role (admin|manager|user) ile uyumlu çalışır.
 */

const SISTEM_ROL_SEVIYE = {
  admin:          5,
  daire_baskani:  4,
  mudur:          3,
  sef:            2,
  personel:       1,
};

/** Kullanıcının efektif sistemRol'ünü döndür */
function getSistemRol(user) {
  return user.sistemRol || _fallback(user.role);
}

function _fallback(role) {
  if (role === 'admin')   return 'admin';
  if (role === 'manager') return 'mudur';
  return 'personel';
}

/** Minimum rol seviyesini kontrol eder */
function hasMinRole(user, minRol) {
  const level    = SISTEM_ROL_SEVIYE[getSistemRol(user)] || 0;
  const required = SISTEM_ROL_SEVIYE[minRol]             || 0;
  return level >= required;
}

/**
 * GET /api/tickets için Prisma where filtresi
 * Hiçbir zaman null döndürmez — admin: {} (hepsi), personel: sadece kendi
 */
async function getTicketFilter(user) {
  const rol = getSistemRol(user);

  switch (rol) {
    case 'admin':
      return {};

    case 'daire_baskani':
      if (!user.directorate) return {}; // directorate yoksa admin gibi hepsi
      return {
        OR: [
          { targetDirectorate: user.directorate },
          { createdBy: { directorate: user.directorate } },
          { assignedTo: { directorate: user.directorate } },
        ],
      };

    case 'mudur':
      if (!user.department) return {};
      return {
        OR: [
          { targetDepartment: user.department },
          { group: { department: user.department } },
          { assignedTo: { department: user.department } },
        ],
      };

    case 'sef':
      // Kendi grubuna atanmış veya kendine atanmış
      if (!user.office && !user.id) return { assignedTo: { username: user.username } };
      return {
        OR: [
          { assignedTo: { username: user.username } },
          ...(user.office ? [{ group: { name: user.office } }] : []),
        ],
      };

    case 'personel':
    default: {
      // createdBy veya assignedTo = bu kullanıcı
      // Kullanıcı id'si token'da olmayabilir; username üzerinden Prisma ilişki filtresi
      return {
        OR: [
          { createdBy: { username: user.username } },
          { assignedTo: { username: user.username } },
        ],
      };
    }
  }
}

/**
 * Onay yetkisi kontrolü
 * admin: herşeyi; daire_baskani/mudur: kendi biriminin ticket'ları
 */
function canApprove(user, ticket) {
  const rol = getSistemRol(user);
  if (rol === 'admin') return true;
  if (rol === 'daire_baskani') {
    if (!user.directorate) return false;
    return (
      ticket.targetDirectorate === user.directorate ||
      ticket.createdBy?.directorate === user.directorate
    );
  }
  if (rol === 'mudur') {
    if (!user.department) return false;
    return (
      ticket.targetDepartment === user.department ||
      ticket.group?.department === user.department
    );
  }
  return false;
}

/**
 * Pending-approval filtresi (POST /pending-approval endpoint'i için)
 */
function getPendingApprovalFilter(user) {
  const rol = getSistemRol(user);
  const base = { status: 'PENDING_APPROVAL' };

  if (rol === 'admin') return base;

  if (rol === 'daire_baskani' && user.directorate) {
    return {
      ...base,
      OR: [
        { targetDirectorate: user.directorate },
        { createdBy: { directorate: user.directorate } },
      ],
    };
  }

  if (rol === 'mudur' && user.department) {
    return {
      ...base,
      OR: [
        { targetDepartment: user.department },
        { group: { department: user.department } },
      ],
    };
  }

  return { ...base, id: -1 }; // yetkisi yok → boş sonuç
}

/** Middleware: minimum sistemRol gerektirir */
function requireSistemRol(minRol) {
  return (req, res, next) => {
    if (!hasMinRole(req.user, minRol)) {
      return res.status(403).json({
        error: 'Yetersiz yetki',
        required: minRol,
        current: getSistemRol(req.user),
      });
    }
    next();
  };
}

module.exports = {
  getSistemRol,
  hasMinRole,
  getTicketFilter,
  canApprove,
  getPendingApprovalFilter,
  requireSistemRol,
  SISTEM_ROL_SEVIYE,
};
