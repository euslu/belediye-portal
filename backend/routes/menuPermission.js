const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth   = require('../middleware/authMiddleware');

// JSON string → array parse helper
function parseJson(str) {
  if (!str) return [];
  try { return JSON.parse(str); } catch { return []; }
}

// Kullanıcı bu menüyü görebilir mi?
function canSee(menu, user) {
  if (menu.herkes) return true;

  const sistemRoller = parseJson(menu.sistemRoller);
  if (sistemRoller.length && sistemRoller.includes(user.sistemRol)) return true;

  const directorates = parseJson(menu.directorates);
  if (directorates.length && user.directorate && directorates.includes(user.directorate)) return true;

  const departments = parseJson(menu.departments);
  if (departments.length && user.department && departments.includes(user.department)) return true;

  const grupIds = parseJson(menu.grupIds);
  if (grupIds.length && user.calismaGruplari?.length) {
    const userGrupIds = user.calismaGruplari.map(g => g.id);
    if (grupIds.some(id => userGrupIds.includes(id))) return true;
  }

  const usernames = parseJson(menu.usernames);
  if (usernames.length && usernames.includes(user.username)) return true;

  return false;
}

// ─── GET /api/menu-permission/my-menu ────────────────────────────────────────
// Kullanıcının göreceği menüleri sidebar formatında döner
router.get('/my-menu', auth, async (req, res) => {
  try {
    const allMenus = await prisma.menuPermission.findMany({
      orderBy: [{ groupOrder: 'asc' }, { itemOrder: 'asc' }],
    });

    const visible = allMenus.filter(m => canSee(m, req.user));

    // Parent-child ilişkisi: menuKey "parent_child" formatında ise parent altına koy
    // Örn: envanter_cihazlar → envanter'in altında subItem olur
    const parentMap = new Map(); // parentKey → [child menus]
    const topLevel = [];

    for (const m of visible) {
      const underIdx = m.menuKey.indexOf('_');
      if (underIdx > 0) {
        const parentKey = m.menuKey.substring(0, underIdx);
        // Parent görünür mü kontrol et
        if (visible.some(p => p.menuKey === parentKey)) {
          if (!parentMap.has(parentKey)) parentMap.set(parentKey, []);
          parentMap.get(parentKey).push(m);
          continue;
        }
      }
      topLevel.push(m);
    }

    // Grupla: groupLabel → items
    const groupMap = new Map();
    for (const m of topLevel) {
      const key = m.groupLabel || '__no_group__';
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          label: m.groupLabel || undefined,
          groupOrder: m.groupOrder,
          items: [],
        });
      }

      const children = parentMap.get(m.menuKey);
      if (children?.length) {
        // Bu menü alt öğeleri olan bir grup
        groupMap.get(key).items.push({
          label: m.label,
          icon: m.icon,
          subGroup: true,
          subItems: children.map(c => ({
            label: c.label,
            icon: c.icon,
            to: c.route,
            exactEnd: c.exactEnd || undefined,
            disabled: c.disabled || undefined,
          })),
        });
      } else {
        groupMap.get(key).items.push({
          label: m.label,
          icon: m.icon,
          to: m.route,
          exactEnd: m.exactEnd || undefined,
          disabled: m.disabled || undefined,
          approvalBadge: m.showApprovalBadge || undefined,
        });
      }
    }

    // groupOrder'a göre sırala
    const groups = [...groupMap.values()]
      .sort((a, b) => a.groupOrder - b.groupOrder)
      .map(({ label, items }) => ({ ...(label ? { label } : {}), items }));

    res.json(groups);
  } catch (err) {
    console.error('my-menu hatası:', err);
    res.status(500).json({ error: 'Menü yüklenemedi' });
  }
});

// ─── GET /api/menu-permission ────────────────────────────────────────────────
// Admin: Tüm menü öğelerini listele
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.sistemRol !== 'admin') {
    return res.status(403).json({ error: 'Yetkisiz' });
  }

  try {
    const menus = await prisma.menuPermission.findMany({
      orderBy: [{ groupOrder: 'asc' }, { itemOrder: 'asc' }],
    });
    res.json(menus);
  } catch (err) {
    console.error('menu-permission list hatası:', err);
    res.status(500).json({ error: 'Listelenemedi' });
  }
});

// ─── PUT /api/menu-permission/:menuKey ───────────────────────────────────────
// Admin: Menü öğesi izinlerini güncelle
router.put('/:menuKey', auth, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.sistemRol !== 'admin') {
    return res.status(403).json({ error: 'Yetkisiz' });
  }

  const { menuKey } = req.params;
  const {
    herkes, sistemRoller, directorates, departments,
    grupIds, usernames, disabled, showApprovalBadge,
  } = req.body;

  try {
    const updated = await prisma.menuPermission.update({
      where: { menuKey },
      data: {
        herkes: herkes ?? undefined,
        sistemRoller: sistemRoller !== undefined ? (sistemRoller ? JSON.stringify(sistemRoller) : null) : undefined,
        directorates: directorates !== undefined ? (directorates ? JSON.stringify(directorates) : null) : undefined,
        departments: departments !== undefined ? (departments ? JSON.stringify(departments) : null) : undefined,
        grupIds: grupIds !== undefined ? (grupIds ? JSON.stringify(grupIds) : null) : undefined,
        usernames: usernames !== undefined ? (usernames ? JSON.stringify(usernames) : null) : undefined,
        disabled: disabled ?? undefined,
        showApprovalBadge: showApprovalBadge ?? undefined,
        updatedBy: req.user.username,
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('menu-permission update hatası:', err);
    res.status(500).json({ error: 'Güncellenemedi' });
  }
});

module.exports = router;
