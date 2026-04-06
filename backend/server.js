require('dotenv').config();
const path    = require('path');
const express = require('express');
const cors = require('cors');

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
const ulakbellRoutes        = require('./routes/ulakbell');
const pdksRoutes            = require('./routes/pdks');
const servicedeskRoutes     = require('./routes/servicedesk');
const servicesRoutes        = require('./routes/services');
const flexcityRoutes        = require('./routes/flexcity');
const muhtarbisRoutes       = require('./routes/muhtarbis');
const muhtarbisAdminRoutes  = require('./routes/muhtarbisAdmin');
const randevuRoutes         = require('./routes/randevu');
const toplantiRoutes        = require('./routes/toplanti');
const gelistirmeRoutes      = require('./routes/gelistirme');
const islemGecmisiRoutes    = require('./routes/islemGecmisi');
const calismaGrubuRoutes    = require('./routes/calismaGrubu');
const rbacRoutes            = require('./routes/rbac');
const lokasyonRoutes        = require('./routes/lokasyon');
const argeRoutes            = require('./routes/arge');

// Zamanlanmış görevler (AD senkronizasyonu)
require('./lib/scheduler');

const app = express();

// Muhtar fotoğrafları static dosya servisi
app.use('/muhtar-foto', express.static(path.join(__dirname, 'public/muhtar-fotolari')));
// İmzalı tutanaklar (auth korumalı)
const authMiddleware = require('./middleware/authMiddleware');
app.use('/tutanaklar', authMiddleware, express.static(path.join(__dirname, 'public/tutanaklar')));

const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // same-origin (nginx proxy) veya listede varsa izin ver
    if (!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o))) return cb(null, true);
    cb(new Error(`CORS: ${origin} izin verilmedi`));
  },
  credentials: true,
}));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
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
app.use('/api/ulakbell',        ulakbellRoutes);
app.use('/api/pdks',            pdksRoutes);
app.use('/api/servicedesk',     servicedeskRoutes);
app.use('/api/services',        servicesRoutes);
app.use('/api/flexcity',        flexcityRoutes);
app.use('/api/muhtarbis',       muhtarbisRoutes);
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
app.use('/api/tutanak',        require('./routes/tutanak'));
// Ticket assign endpoint groups router altında
app.use('/api',                 groupRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});
