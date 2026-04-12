'use strict';
const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

router.use(authMiddleware);

// ─── GET /api/services/status ─────────────────────────────────────────────────
// Tüm servislerin son çalışma durumunu döndür
router.get('/status', async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const SERVICE_KEYS = [
    'SERVICE_STATUS_AD_SYNC',
    'SERVICE_STATUS_BIRTHDAY_MAIL',
    'SERVICE_STATUS_WELCOME_MAIL',
    'SERVICE_STATUS_EPC_SYNC',
    'SERVICE_STATUS_EMAIL_POLL',
    'SERVICE_STATUS_FLEXCITY',
  ];

  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: SERVICE_KEYS } },
    });

    const statusMap = {};
    settings.forEach((s) => {
      try { statusMap[s.key] = JSON.parse(s.value); }
      catch { statusMap[s.key] = { status: 'unknown', message: s.value }; }
    });

    // Tanımlı ama hiç çalışmamış servisler için default
    SERVICE_KEYS.forEach((k) => {
      if (!statusMap[k]) statusMap[k] = { status: 'never', message: 'Henüz çalışmadı', lastRun: null };
    });

    res.json(statusMap);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Servis durumları alınamadı' });
  }
});

// ─── POST /api/services/test-all ─────────────────────────────────────────────
// Tüm servisleri manuel tetikle (test)
router.post('/test-all', async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const results = {};

  // Birthday mail
  try {
    const { sendBirthdayMails } = require('../lib/birthdayMailer');
    results.birthdayMail = await sendBirthdayMails();
  } catch (err) {
    results.birthdayMail = { error: err.message };
  }

  // Welcome mail
  try {
    const { sendWelcomeMails } = require('../lib/welcomeMailer');
    results.welcomeMail = await sendWelcomeMails();
  } catch (err) {
    results.welcomeMail = { error: err.message };
  }

  // AD Sync
  try {
    const { runAdSync } = require('../lib/adSync');
    const changes = await runAdSync();
    results.adSync = { changes: changes.length };
  } catch (err) {
    results.adSync = { error: err.message };
  }

  res.json(results);
});

// ─── POST /api/services/run/:service ─────────────────────────────────────────
// Belirli bir servisi tetikle
router.post('/run/:service', async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const { service } = req.params;

  try {
    let result;
    switch (service) {
      case 'birthday-mail': {
        const { sendBirthdayMails } = require('../lib/birthdayMailer');
        result = await sendBirthdayMails();
        break;
      }
      case 'welcome-mail': {
        const { sendWelcomeMails } = require('../lib/welcomeMailer');
        result = await sendWelcomeMails();
        break;
      }
      case 'ad-sync': {
        const { runAdSync } = require('../lib/adSync');
        const changes = await runAdSync();
        result = { changes: changes.length };
        break;
      }
      case 'epc-sync': {
        const { syncToInventory } = require('../services/servicedesk');
        result = await syncToInventory();
        break;
      }
      case 'flexcity-sync': {
        const { syncAll } = require('../lib/flexcitySync');
        result = await syncAll();
        break;
      }
      default:
        return res.status(400).json({ error: `Bilinmeyen servis: ${service}` });
    }
    res.json({ ok: true, result });
  } catch (err) {
    logger.error(`[services/run] ${service}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
