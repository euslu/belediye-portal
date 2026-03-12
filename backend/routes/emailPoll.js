const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { pollEmails } = require('../lib/emailPoller');

router.use(authMiddleware);

const ADMIN_ONLY = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkiniz yok' });
  next();
};

// ─── POST /api/admin/email-poll ──────────────────────────────────────────────
// Manuel e-posta taraması başlat
router.post('/', ADMIN_ONLY, async (req, res) => {
  try {
    const result = await pollEmails();
    res.json({ message: 'E-posta taraması tamamlandı', ...result });
  } catch (err) {
    console.error('[EmailPoll] Manuel tarama hatası:', err.message);
    res.status(500).json({ error: 'Tarama başarısız: ' + err.message });
  }
});

// ─── GET /api/admin/email-poll/status ────────────────────────────────────────
router.get('/status', ADMIN_ONLY, (req, res) => {
  res.json({
    enabled:  process.env.IMAP_ENABLED === 'true',
    host:     process.env.IMAP_HOST    || null,
    user:     process.env.IMAP_USER    || null,
    mailbox:  process.env.IMAP_MAILBOX || 'INBOX',
    interval: '5 dakika',
  });
});

module.exports = router;
