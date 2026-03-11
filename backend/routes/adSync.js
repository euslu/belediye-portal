const express  = require('express');
const router   = express.Router();
const prisma   = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const { runAdSync }  = require('../lib/adSync');

router.use(authMiddleware);

// ─── POST /api/admin/ad-sync ──────────────────────────────────────────────────
// Manuel senkronizasyon tetikle (sadece admin)
router.post('/', async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Sadece adminler çalıştırabilir' });

  try {
    const changes = await runAdSync();
    res.json({ ok: true, count: changes.length, changes });
  } catch (err) {
    console.error('[AD Sync] Hata:', err);
    res.status(500).json({ error: 'AD senkronizasyonu başarısız', detail: err.message });
  }
});

// ─── GET /api/admin/ad-changes ────────────────────────────────────────────────
// Tüm değişiklik kayıtları (admin/manager)
router.get('/changes', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  try {
    const { page = '1', limit = '50', changeType, notified } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (changeType) where.changeType = changeType;
    if (notified !== undefined) where.notified = notified === 'true';

    const [total, logs] = await Promise.all([
      prisma.adChangeLog.count({ where }),
      prisma.adChangeLog.findMany({
        where,
        orderBy: { detectedAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
    ]);

    res.json({ total, page: parseInt(page), logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Değişiklikler alınamadı' });
  }
});

// ─── GET /api/admin/ad-changes/unnotified-count ───────────────────────────────
// Bildirilmemiş değişiklik sayısı (badge için)
router.get('/changes/unnotified-count', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  try {
    const count = await prisma.adChangeLog.count({ where: { notified: false } });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Sayım alınamadı' });
  }
});

// ─── PATCH /api/admin/ad-changes/:id/notified ─────────────────────────────────
// Kaydı bildirildi olarak işaretle
router.patch('/changes/:id/notified', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  try {
    const log = await prisma.adChangeLog.update({
      where: { id: parseInt(req.params.id) },
      data:  { notified: true },
    });
    res.json(log);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Kayıt bulunamadı' });
    res.status(500).json({ error: 'Güncellenemedi' });
  }
});

// ─── PATCH /api/admin/ad-changes/mark-all-notified ────────────────────────────
// Tümünü bildirildi işaretle
router.patch('/changes/mark-all-notified', async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Sadece adminler yapabilir' });

  try {
    const result = await prisma.adChangeLog.updateMany({
      where: { notified: false },
      data:  { notified: true },
    });
    res.json({ ok: true, updated: result.count });
  } catch (err) {
    res.status(500).json({ error: 'Güncellenemedi' });
  }
});

module.exports = router;
