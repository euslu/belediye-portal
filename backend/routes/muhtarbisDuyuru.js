const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const auth    = require('../middleware/authMiddleware');
const { checkMuhtarlikAccess, requireMuhtarlikRole } = require('../middleware/muhtarlikAuth');
const { smsSend }  = require('../services/sms');
const { sendMail } = require('../lib/mailer');
const { logIslem } = require('../middleware/auditLog');

router.use(auth, checkMuhtarlikAccess);

// ─── Duyuru geçmişi ─────────────────────────────────────────────────────────
router.get('/', requireMuhtarlikRole('mudur'), async (req, res) => {
  try {
    const sayfa = Math.max(1, parseInt(req.query.sayfa) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip  = (sayfa - 1) * limit;

    const [liste, toplam] = await Promise.all([
      prisma.muhtarlikDuyuru.findMany({
        orderBy: { olusturmaTarih: 'desc' },
        skip,
        take: limit,
      }),
      prisma.muhtarlikDuyuru.count(),
    ]);

    res.json({ liste, toplam, sayfa, limit });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Önizleme — hedef muhtar sayılarını döndür ─────────────────────────────
router.get('/onizleme', requireMuhtarlikRole('mudur'), async (req, res) => {
  try {
    const ilceler   = req.query.ilceler   ? req.query.ilceler.split(',').map(s => s.trim()).filter(Boolean) : [];
    const mahalleler = req.query.mahalleler ? req.query.mahalleler.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (!ilceler.length) return res.status(400).json({ error: 'En az bir ilçe seçilmelidir' });

    const where = {
      ilce:  { in: ilceler },
      aktif: true,
      ...(mahalleler.length ? { mahalle: { in: mahalleler } } : {}),
    };

    const muhtarlar = await prisma.muhtar.findMany({ where, select: { gsm: true, muhtarAdi: true } });
    const toplamMuhtar = muhtarlar.length;
    const smsHedef     = muhtarlar.filter(m => m.gsm && m.gsm.trim()).length;

    res.json({ toplamMuhtar, smsHedef });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Duyuru gönder ──────────────────────────────────────────────────────────
router.post('/', requireMuhtarlikRole('mudur'), async (req, res) => {
  try {
    const { baslik, mesaj, kanallar, ilceler: ilcelerStr, mahalleler: mahallelerStr } = req.body;

    if (!baslik || !mesaj || !kanallar || !ilcelerStr) {
      return res.status(400).json({ error: 'baslik, mesaj, kanallar ve ilceler zorunludur' });
    }

    const ilceler    = ilcelerStr.split(',').map(s => s.trim()).filter(Boolean);
    const mahalleler = mahallelerStr ? mahallelerStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    const kanallarArr = kanallar.split(',').map(s => s.trim().toLowerCase());

    const where = {
      ilce:  { in: ilceler },
      aktif: true,
      ...(mahalleler.length ? { mahalle: { in: mahalleler } } : {}),
    };

    const muhtarlar = await prisma.muhtar.findMany({ where, select: { gsm: true, muhtarAdi: true, ilce: true, mahalle: true } });

    let smsBasarili = 0, smsBasarisiz = 0;
    let emailBasarili = 0, emailBasarisiz = 0;
    let hata = null;

    // SMS
    if (kanallarArr.includes('sms')) {
      const gsmler = muhtarlar.map(m => m.gsm).filter(Boolean);
      if (gsmler.length) {
        try {
          const sonuc = await smsSend(gsmler, mesaj);
          smsBasarili  = sonuc.basarili || 0;
          smsBasarisiz = sonuc.basarisiz || 0;
        } catch (e) {
          hata = (hata ? hata + '; ' : '') + 'SMS: ' + e.message;
          smsBasarisiz = gsmler.length;
        }
      }
    }

    // Email — Muhtar tablosunda email yok, sadece SMS destekleniyor şu an
    // Email kanalı seçilirse bilgilendirme notu eklenir
    if (kanallarArr.includes('email')) {
      hata = (hata ? hata + '; ' : '') + 'Muhtar tablosunda e-posta alanı bulunmamaktadır';
    }

    const duyuru = await prisma.muhtarlikDuyuru.create({
      data: {
        baslik,
        mesaj,
        kanallar,
        ilceler:        ilcelerStr,
        mahalleler:     mahallelerStr || null,
        hedefSayisi:    muhtarlar.length,
        smsBasarili,
        smsBasarisiz,
        emailBasarili,
        emailBasarisiz,
        hata,
        gonderen:       req.user.username,
        gonderenAd:     req.user.displayName || req.user.username,
      },
    });

    logIslem({
      kullanici:   req.user.username,
      kullaniciAd: req.user.displayName,
      islem:       'CREATE',
      modul:       'muhtarlik_duyuru',
      kayitId:     duyuru.id,
      detay:       { baslik, kanallar, ilceler: ilcelerStr, hedef: muhtarlar.length },
      ip:          req.ip,
    });

    res.json(duyuru);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
