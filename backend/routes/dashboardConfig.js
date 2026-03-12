const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Varsayılan widget listesi (DB boşsa kullanılır)
const DEFAULT_WIDGETS = [
  { key: 'stat_cards',        name: 'Özet Kartlar',         description: 'Toplam, açık, çözülen ticket sayıları', icon: '📊', roles: 'admin,manager', defaultOn: true },
  { key: 'daily_trend',       name: 'Günlük Trend',         description: 'Açılan/kapanan ticket grafiği',         icon: '📈', roles: 'admin,manager', defaultOn: true },
  { key: 'status_pie',        name: 'Durum Dağılımı',       description: 'Ticket durumlarının pasta grafiği',     icon: '🥧', roles: 'admin,manager', defaultOn: true },
  { key: 'top_subjects',      name: 'En Çok Başvurulan',    description: 'En sık açılan konular',                 icon: '🏆', roles: 'admin,manager', defaultOn: true },
  { key: 'personnel_perf',    name: 'Personel Performansı', description: 'En çok ticket kapatan personel',        icon: '👥', roles: 'admin,manager', defaultOn: true },
  { key: 'pending_approvals', name: 'Onay Bekleyenler',     description: 'Onay bekleyen talepler',                icon: '⏳', roles: 'admin,manager', defaultOn: true },
  { key: 'my_devices',        name: 'Cihazlarım',           description: 'Atanmış cihaz listesi',                 icon: '💻', roles: 'admin,manager,user', defaultOn: true },
  { key: 'my_tickets',        name: 'Başvurularım',         description: 'Kişisel ticket geçmişi',                icon: '🎫', roles: 'admin,manager,user', defaultOn: true },
  { key: 'my_tasks',          name: 'Görevlerim',           description: 'Atanmış görevler',                     icon: '✅', roles: 'admin,manager', defaultOn: true },
  { key: 'transfers',         name: 'Aktarma Kayıtları',    description: 'Grup/kişi aktarma geçmişi',            icon: '🔄', roles: 'admin,manager', defaultOn: false },
  { key: 'sla_breaches',      name: 'SLA İhlalleri',        description: 'SLA ihlali yapan kullanıcılar',         icon: '🚨', roles: 'admin,manager', defaultOn: true },
];

async function ensureWidgets() {
  for (const w of DEFAULT_WIDGETS) {
    await prisma.dashboardWidget.upsert({
      where:  { key: w.key },
      update: { name: w.name, description: w.description, icon: w.icon, roles: w.roles, defaultOn: w.defaultOn },
      create: w,
    });
  }
}

// ─── GET /api/dashboard/widgets ───────────────────────────────────────────────
router.get('/widgets', async (req, res) => {
  try {
    await ensureWidgets();
    const widgets = await prisma.dashboardWidget.findMany({ orderBy: { id: 'asc' } });
    // Kullanıcı rolüne göre filtrele
    const userRole = req.user.role;
    const filtered = widgets.filter(w => w.roles.split(',').includes(userRole));
    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Widget listesi alınamadı' });
  }
});

// ─── GET /api/dashboard/config ────────────────────────────────────────────────
router.get('/config', async (req, res) => {
  try {
    // Önce kullanıcı konfigürasyonu
    const userConfig = await prisma.userDashboardConfig.findUnique({
      where: { username: req.user.username },
    });
    if (userConfig) return res.json(JSON.parse(userConfig.widgets));

    // Yoksa rol bazlı varsayılan
    const roleConfig = await prisma.roleDashboardConfig.findUnique({
      where: { role: req.user.role },
    });
    if (roleConfig) return res.json(JSON.parse(roleConfig.widgets));

    // Yoksa global varsayılan
    await ensureWidgets();
    const widgets = await prisma.dashboardWidget.findMany({
      where: { defaultOn: true },
    });
    const defaults = widgets
      .filter(w => w.roles.split(',').includes(req.user.role))
      .map(w => w.key);
    res.json(defaults);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Konfigürasyon alınamadı' });
  }
});

// ─── POST /api/dashboard/config ───────────────────────────────────────────────
router.post('/config', async (req, res) => {
  const { widgets } = req.body;
  if (!Array.isArray(widgets)) return res.status(400).json({ error: 'widgets dizisi gerekli' });

  try {
    await prisma.userDashboardConfig.upsert({
      where:  { username: req.user.username },
      update: { widgets: JSON.stringify(widgets) },
      create: { username: req.user.username, widgets: JSON.stringify(widgets) },
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Konfigürasyon kaydedilemedi' });
  }
});

// ─── GET /api/dashboard/role-config/:role ─────────────────────────────────────
router.get('/role-config/:role', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
  try {
    const config = await prisma.roleDashboardConfig.findUnique({
      where: { role: req.params.role },
    });
    if (!config) return res.json([]);
    res.json(JSON.parse(config.widgets));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Konfigürasyon alınamadı' });
  }
});

// ─── POST /api/dashboard/role-config/:role ────────────────────────────────────
router.post('/role-config/:role', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
  const { widgets } = req.body;
  if (!Array.isArray(widgets)) return res.status(400).json({ error: 'widgets dizisi gerekli' });

  try {
    await prisma.roleDashboardConfig.upsert({
      where:  { role: req.params.role },
      update: { widgets: JSON.stringify(widgets) },
      create: { role: req.params.role, widgets: JSON.stringify(widgets) },
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Konfigürasyon kaydedilemedi' });
  }
});

module.exports = router;
