require('dotenv').config();
const path    = require('path');
const fs      = require('fs');
const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');

const authRoutes       = require('./routes/auth');
const ticketRoutes     = require('./routes/tickets');
const groupRoutes      = require('./routes/groups');
const userRoutes       = require('./routes/users');
const categoryRoutes   = require('./routes/categories');
const settingsRoutes   = require('./routes/settings');
const submitTypeRoutes = require('./routes/submitTypes');
const subjectRoutes    = require('./routes/subjects');
const adSyncRoutes     = require('./routes/adSync');
const emailPollRoutes  = require('./routes/emailPoll');
const workOrderRoutes  = require('./routes/workOrders');
const deviceRoutes     = require('./routes/devices');
const locationRoutes   = require('./routes/locations');
const inventoryRoutes  = require('./routes/inventory');
const dashboardRoutes       = require('./routes/dashboard');
const departmentRoutes      = require('./routes/departments');
const dashboardConfigRoutes = require('./routes/dashboardConfig');
const systemSettingsRoutes  = require('./routes/systemSettings');
const ulakbellRoutes              = require('./routes/ulakbell');
const ulakbellBildirimlerRoutes  = require('./routes/ulakbellBildirimler');
const pdksRoutes            = require('./routes/pdks');
const servicedeskRoutes     = require('./routes/servicedesk');
const servicesRoutes        = require('./routes/services');
const flexcityRoutes        = require('./routes/flexcity');
const muhtarbisRoutes       = require('./routes/muhtarbis');
const muhtarbisAdminRoutes  = require('./routes/muhtarbisAdmin');
const muhtarbisDuyuruRoutes = require('./routes/muhtarbisDuyuru');
const randevuRoutes         = require('./routes/randevu');
const toplantiRoutes        = require('./routes/toplanti');
const gelistirmeRoutes      = require('./routes/gelistirme');
const islemGecmisiRoutes    = require('./routes/islemGecmisi');
const calismaGrubuRoutes    = require('./routes/calismaGrubu');
const rbacRoutes            = require('./routes/rbac');
const lokasyonRoutes        = require('./routes/lokasyon');
const argeRoutes            = require('./routes/arge');
const menuPermissionRoutes  = require('./routes/menuPermission');

// Zamanlanmış görevler (AD senkronizasyonu)
require('./lib/scheduler');

// SLA kontrol servisi (30dk'da bir SMS bildirimi)
const { startSlaChecker } = require('./services/slaChecker');
startSlaChecker();

const app = express();
app.set('trust proxy', 1);

// Muhtar fotoğrafları static dosya servisi
app.use('/muhtar-foto', express.static(path.join(__dirname, 'public/muhtar-fotolari')));
// İmzalı tutanaklar (auth korumalı)
const authMiddleware = require('./middleware/authMiddleware');
app.use('/tutanaklar', authMiddleware, express.static(path.join(__dirname, 'public/tutanaklar')));
// Başvuru ek dosyaları (auth korumalı)
app.use('/basvuru-eklentileri', authMiddleware, express.static(path.join(__dirname, 'public/basvuru-eklentileri')));

const ALLOWED_ORIGINS = Array.from(new Set(
  (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)
    .flatMap((origin) => {
      try {
        const url = new URL(origin);
        return [
          url.origin,
          `http://${url.host}`,
          `https://${url.host}`,
        ];
      } catch {
        return [origin];
      }
    })
));

app.use(cors({
  origin: (origin, cb) => {
    // same-origin (nginx proxy) veya açıkça izinli origin
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} izin verilmedi`));
  },
  credentials: true,
}));
app.use(express.json());

app.get('/health', (req, res) => {
  // Son 1 saatteki hata sayısını log dosyasından oku
  let errorsLastHour = 0;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const logFile = path.join(__dirname, 'logs', `app-${today}.log`);
    if (fs.existsSync(logFile)) {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.level === 'error' && new Date(entry.timestamp).getTime() >= oneHourAgo) {
            errorsLastHour++;
          }
        } catch {}
      }
    }
  } catch {}
  res.json({ status: 'ok', uptime: process.uptime(), errors_last_hour: errorsLastHour });
});
app.use('/api/auth',         authRoutes);
app.use('/api/tickets',      ticketRoutes);
app.use('/api/categories',   categoryRoutes);
app.use('/api/groups',       groupRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/settings',     settingsRoutes);
app.use('/api/submit-types',    submitTypeRoutes);
app.use('/api/subjects',        subjectRoutes);
app.use('/api/admin/ad-sync',   adSyncRoutes);
app.use('/api/admin/email-poll', emailPollRoutes);
app.use('/api/work-orders',     workOrderRoutes);
app.use('/api/devices',         deviceRoutes);
app.use('/api/locations',       locationRoutes);
app.use('/api/inventory',       inventoryRoutes);
app.use('/api/dashboard',       dashboardRoutes);
app.use('/api/dashboard',       dashboardConfigRoutes);
app.use('/api/system-settings', systemSettingsRoutes);
app.use('/api/departments',     departmentRoutes);
app.use('/api/ulakbell',              ulakbellRoutes);
app.use('/api/ulakbell-bildirimler', ulakbellBildirimlerRoutes);
app.use('/api/pdks',            pdksRoutes);
app.use('/api/servicedesk',     servicedeskRoutes);
app.use('/api/services',        servicesRoutes);
app.use('/api/flexcity',        flexcityRoutes);
app.use('/api/muhtarbis',       muhtarbisRoutes);
app.use('/api/muhtarbis/duyuru', muhtarbisDuyuruRoutes);
app.use('/api/muhtarbis/admin', muhtarbisAdminRoutes);
app.use('/api/muhtarbis/auth',  muhtarbisAdminRoutes);
app.use('/api/randevu',         randevuRoutes);
app.use('/api/toplanti',        toplantiRoutes);
app.use('/api/gelistirme',      gelistirmeRoutes);
app.use('/api/islem-gecmisi',   islemGecmisiRoutes);
app.use('/api/calisma-grubu',   calismaGrubuRoutes);
app.use('/api/rbac',            rbacRoutes);
app.use('/api/lokasyon',        lokasyonRoutes);
app.use('/api/arge',            argeRoutes);
app.use('/api/menu-permission', menuPermissionRoutes);
app.use('/api/tutanak',        require('./routes/tutanak'));
// Ticket assign endpoint groups router altında
app.use('/api',                 groupRoutes);

app.use(require('./middleware/errorHandler'));

// ulakBELL polling servisi
const { startPoller } = require('./services/ulakbellPoller');
startPoller();

// Audit log temizliği — günde 1 kez (90 günden eski kayıtları sil)
const { cleanupOldAuditLogs } = require('./utils/auditCleanup');
cleanupOldAuditLogs(); // başlangıçta bir kez çalıştır
setInterval(cleanupOldAuditLogs, 24 * 60 * 60 * 1000);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Sunucu çalışıyor: http://localhost:${PORT}`);
});
