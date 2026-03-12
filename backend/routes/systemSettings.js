const express    = require('express');
const router     = express.Router();
const prisma     = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const { Client } = require('ldapts');
const nodemailer = require('nodemailer');

router.use(authMiddleware);

const ADMIN_ONLY = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
  next();
};

function maskValue(setting) {
  if (setting.encrypted && setting.value) return { ...setting, value: '****' };
  return setting;
}

// ─── GET /api/system-settings/:category ───────────────────────────────────────
router.get('/:category', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
  try {
    const rows = await prisma.systemSetting.findMany({
      where: { category: req.params.category.toUpperCase() },
      orderBy: { key: 'asc' },
    });
    // Şifreli alanları maskele
    const result = Object.fromEntries(
      rows.map(r => [r.key, maskValue(r)])
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ayarlar alınamadı' });
  }
});

// ─── POST /api/system-settings/:category ──────────────────────────────────────
router.post('/:category', ADMIN_ONLY, async (req, res) => {
  const category = req.params.category.toUpperCase();
  const entries  = Object.entries(req.body); // { key: value }
  if (!entries.length) return res.status(400).json({ error: 'Boş istek' });

  try {
    // Hangi alanlar encrypted?
    const existing = await prisma.systemSetting.findMany({ where: { category } });
    const encryptedKeys = new Set(existing.filter(r => r.encrypted).map(r => r.key));

    await prisma.$transaction(
      entries.map(([key, value]) => {
        const isEncrypted = encryptedKeys.has(key) ||
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('pass');
        // Maskelenmiş değer geldiyse (****) güncelleme
        if (value === '****') {
          return prisma.systemSetting.updateMany({ where: { key }, data: { updatedBy: req.user.username } });
        }
        return prisma.systemSetting.upsert({
          where:  { key },
          update: { value: value !== undefined ? String(value) : null, updatedBy: req.user.username },
          create: { category, key, value: value !== undefined ? String(value) : null, encrypted: isEncrypted, updatedBy: req.user.username },
        });
      })
    );

    // Aynı zamanda .env ile uyumlu Setting tablosunu da güncelle (SLA vb. için)
    const legacyMap = {
      'ad_url': 'AD_URL', 'ad_host': 'AD_HOST', 'ad_domain': 'AD_DOMAIN',
      'ad_base_dn': 'AD_BASE_DN', 'ad_username': 'AD_USERNAME',
      'smtp_host': 'SMTP_HOST', 'smtp_port': 'SMTP_PORT',
      'mock_auth': 'MOCK_AUTH',
    };
    const legacyEntries = entries.filter(([k]) => legacyMap[k.toLowerCase()] && value !== '****');
    if (legacyEntries.length) {
      await prisma.$transaction(
        legacyEntries.map(([k, v]) =>
          prisma.setting.upsert({
            where:  { key: legacyMap[k.toLowerCase()] },
            update: { value: String(v) },
            create: { key: legacyMap[k.toLowerCase()], value: String(v) },
          })
        )
      ).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ayarlar kaydedilemedi' });
  }
});

// ─── POST /api/system-settings/test/ad ────────────────────────────────────────
router.post('/test/ad', ADMIN_ONLY, async (req, res) => {
  const {
    ad_url, ad_username, ad_password, ad_domain, ad_base_dn,
  } = req.body;

  const url    = ad_url    || process.env.AD_URL;
  const user   = ad_username || process.env.AD_USERNAME;
  const pass   = ad_password === '****'
    ? (await prisma.systemSetting.findUnique({ where: { key: 'ad_password' } }))?.value || process.env.AD_PASSWORD
    : ad_password || process.env.AD_PASSWORD;
  const domain  = ad_domain   || process.env.AD_DOMAIN;
  const base_dn = ad_base_dn  || process.env.AD_BASE_DN;

  if (!url || !user || !pass) {
    return res.status(400).json({ success: false, message: 'AD bilgileri eksik' });
  }

  const client = new Client({ url, connectTimeout: 8000, timeout: 10000 });
  try {
    await client.bind(`${user}@${domain}`, pass);
    const { searchEntries } = await client.search(base_dn, {
      scope: 'sub',
      filter: '(objectClass=user)',
      attributes: ['sAMAccountName'],
      sizeLimit: 1000,
    });
    res.json({ success: true, message: 'Bağlantı başarılı', userCount: searchEntries.length });
  } catch (err) {
    res.json({ success: false, message: err.message });
  } finally {
    client.unbind().catch(() => {});
  }
});

// ─── POST /api/system-settings/test/smtp ──────────────────────────────────────
router.post('/test/smtp', ADMIN_ONLY, async (req, res) => {
  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, test_email } = req.body;

  const pass = smtp_pass === '****'
    ? (await prisma.systemSetting.findUnique({ where: { key: 'smtp_pass' } }))?.value || process.env.SMTP_PASS
    : smtp_pass || process.env.SMTP_PASS;

  const transporter = nodemailer.createTransport({
    host:   smtp_host || process.env.SMTP_HOST,
    port:   parseInt(smtp_port || process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: smtp_user || process.env.SMTP_USER,
      pass,
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 8000,
  });

  try {
    await transporter.verify();
    if (test_email) {
      await transporter.sendMail({
        from:    smtp_from || process.env.SMTP_FROM || smtp_user,
        to:      test_email,
        subject: 'Belediye Portal — Test Maili',
        text:    'Bu mail SMTP bağlantı testi için gönderilmiştir.',
      });
    }
    res.json({ success: true, message: test_email ? `Test maili ${test_email} adresine gönderildi` : 'SMTP bağlantısı başarılı' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ─── POST /api/system-settings/test/pdks ──────────────────────────────────────
router.post('/test/pdks', ADMIN_ONLY, async (req, res) => {
  const { pdks_url, pdks_username, pdks_password } = req.body;
  if (!pdks_url) return res.json({ success: false, message: 'PDKS URL girilmedi' });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(pdks_url, {
      signal: controller.signal,
      headers: pdks_username ? {
        'Authorization': 'Basic ' + Buffer.from(`${pdks_username}:${pdks_password}`).toString('base64'),
      } : {},
    });
    clearTimeout(timeout);
    res.json({ success: r.ok, message: r.ok ? `Bağlantı başarılı (HTTP ${r.status})` : `HTTP ${r.status} hatası` });
  } catch (err) {
    res.json({ success: false, message: err.message.includes('abort') ? 'Bağlantı zaman aşımı (8s)' : err.message });
  }
});

module.exports = router;
