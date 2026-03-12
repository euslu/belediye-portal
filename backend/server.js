require('dotenv').config();
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
const deviceRoutes     = require('./routes/devices');
const locationRoutes   = require('./routes/locations');
const inventoryRoutes  = require('./routes/inventory');
const dashboardRoutes       = require('./routes/dashboard');
const departmentRoutes      = require('./routes/departments');
const dashboardConfigRoutes = require('./routes/dashboardConfig');
const systemSettingsRoutes  = require('./routes/systemSettings');

// Zamanlanmış görevler (AD senkronizasyonu)
require('./lib/scheduler');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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
app.use('/api/devices',         deviceRoutes);
app.use('/api/locations',       locationRoutes);
app.use('/api/inventory',       inventoryRoutes);
app.use('/api/dashboard',       dashboardRoutes);
app.use('/api/dashboard',       dashboardConfigRoutes);
app.use('/api/system-settings', systemSettingsRoutes);
app.use('/api/departments',     departmentRoutes);
// Ticket assign endpoint groups router altında
app.use('/api',                 groupRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});
