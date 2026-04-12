'use strict';
const router  = require('express').Router();
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const prisma  = require('../lib/prisma');
const auth    = require('../middleware/authMiddleware');
const { logIslem } = require('../middleware/auditLog');

router.use(auth);

// ─── Multer — imzalı tutanak yükleme ──────────────────────────────────────────
const TUTANAK_DIR = path.join(__dirname, '../public/tutanaklar');
if (!fs.existsSync(TUTANAK_DIR)) fs.mkdirSync(TUTANAK_DIR, { recursive: true });

const tutanakStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TUTANAK_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `tutanak_${req.params.id}_${Date.now()}${ext}`);
  },
});
const tutanakUpload = multer({
  storage: tutanakStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['.pdf', '.jpg', '.jpeg', '.png'].includes(
      path.extname(file.originalname).toLowerCase()
    );
    cb(ok ? null : new Error('Sadece PDF, JPG veya PNG yüklenebilir'), ok);
  },
});

// ─── GET /api/toplanti/istatistik ─────────────────────────────────────────────
router.get('/istatistik', async (req, res) => {
  try {
    const now     = new Date();
    const ayBasi  = new Date(now.getFullYear(), now.getMonth(), 1);
    const [
      toplamToplanti, buAy, planli, tamamlandi, iptal, toplamKatilimci,
    ] = await Promise.all([
      prisma.toplanti.count(),
      prisma.toplanti.count({ where: { tarih: { gte: ayBasi } } }),
      prisma.toplanti.count({ where: { durum: 'planli' } }),
      prisma.toplanti.count({ where: { durum: 'tamamlandi' } }),
      prisma.toplanti.count({ where: { durum: 'iptal' } }),
      prisma.toplantiKatilimci.count(),
    ]);
    res.json({ toplamToplanti, buAy, planli, tamamlandi, iptal, toplamKatilimci });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/toplanti ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { sayfa = 1, limit = 20, durum, tip, baslangic, bitis } = req.query;
    const where = {};
    if (durum)     where.durum = durum;
    if (tip)       where.tip   = tip;
    if (baslangic || bitis) {
      where.tarih = {};
      if (baslangic) where.tarih.gte = new Date(baslangic);
      if (bitis)     where.tarih.lte = new Date(bitis + 'T23:59:59');
    }
    const pg  = Math.max(1, +sayfa);
    const lm  = Math.min(100, Math.max(1, +limit));
    const [toplam, toplanti] = await Promise.all([
      prisma.toplanti.count({ where }),
      prisma.toplanti.findMany({
        where,
        include: {
          katilimcilar: true,
          gundemler: { orderBy: { sira: 'asc' } },
        },
        orderBy: { tarih: 'desc' },
        skip: (pg - 1) * lm,
        take: lm,
      }),
    ]);
    res.json({ toplanti, toplam, sayfa: pg, toplamSayfa: Math.ceil(toplam / lm) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/toplanti/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const t = await prisma.toplanti.findUnique({
      where: { id: +req.params.id },
      include: {
        katilimcilar: { orderBy: [{ ilce: 'asc' }, { ad: 'asc' }] },
        gundemler: { orderBy: { sira: 'asc' } },
      },
    });
    if (!t) return res.status(404).json({ error: 'Bulunamadı' });
    res.json(t);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/toplanti ───────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { baslik, tarih, saat, yer, tip, durum, aciklama, gundemler = [], katilimcilar = [] } = req.body;
    if (!baslik || !tarih || !saat) return res.status(400).json({ error: 'Başlık, tarih ve saat zorunlu' });
    const t = await prisma.toplanti.create({
      data: {
        baslik, saat,
        tarih:    new Date(tarih),
        yer:      yer      || null,
        tip:      tip      || 'muhtarlar',
        durum:    durum    || 'planli',
        aciklama: aciklama || null,
        olusturan: req.user?.username || 'sistem',
        gundemler: {
          create: gundemler.map((g, i) => ({
            sira:      g.sira ?? i + 1,
            konu:      g.konu,
            aciklama:  g.aciklama || null,
            sure:      g.sure ? +g.sure : null,
          })),
        },
        katilimcilar: {
          create: katilimcilar.map(k => ({
            tip:     k.tip || 'muhtar',
            ad:      k.ad,
            ilce:    k.ilce    || null,
            mahalle: k.mahalle || null,
          })),
        },
      },
      include: { katilimcilar: true, gundemler: { orderBy: { sira: 'asc' } } },
    });
    res.status(201).json(t);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PUT /api/toplanti/:id ────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const id = +req.params.id;
    const { baslik, tarih, saat, yer, tip, durum, aciklama, not, gundemler, katilimcilar } = req.body;
    const data = {};
    if (baslik    !== undefined) data.baslik    = baslik;
    if (tarih     !== undefined) data.tarih     = new Date(tarih);
    if (saat      !== undefined) data.saat      = saat;
    if (yer       !== undefined) data.yer       = yer;
    if (tip       !== undefined) data.tip       = tip;
    if (durum     !== undefined) data.durum     = durum;
    if (aciklama  !== undefined) data.aciklama  = aciklama;
    if (not       !== undefined) data.not       = not;

    // Gündem ve katılımcıları toplu güncelle (önce sil, yeniden oluştur)
    if (gundemler) {
      await prisma.toplantiGundem.deleteMany({ where: { toplantiId: id } });
      data.gundemler = {
        create: gundemler.map((g, i) => ({
          sira: g.sira ?? i + 1, konu: g.konu,
          aciklama: g.aciklama || null, sure: g.sure ? +g.sure : null,
          tamamlandi: g.tamamlandi || false,
        })),
      };
    }
    if (katilimcilar) {
      await prisma.toplantiKatilimci.deleteMany({ where: { toplantiId: id } });
      data.katilimcilar = {
        create: katilimcilar.map(k => ({
          tip: k.tip || 'muhtar', ad: k.ad,
          ilce: k.ilce || null, mahalle: k.mahalle || null,
          katildi: k.katildi || false,
        })),
      };
    }

    const t = await prisma.toplanti.update({
      where: { id },
      data,
      include: { katilimcilar: true, gundemler: { orderBy: { sira: 'asc' } } },
    });
    res.json(t);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/toplanti/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await prisma.toplanti.delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PUT /api/toplanti/:id/katilim ────────────────────────────────────────────
router.put('/:id/katilim', async (req, res) => {
  try {
    const { katilimciId, katildi } = req.body;
    const k = await prisma.toplantiKatilimci.update({
      where: { id: +katilimciId },
      data:  { katildi: !!katildi },
    });
    res.json(k);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PUT /api/toplanti/:id/gundem/:gundemId ───────────────────────────────────
router.put('/:id/gundem/:gundemId', async (req, res) => {
  try {
    const g = await prisma.toplantiGundem.update({
      where: { id: +req.params.gundemId },
      data:  { tamamlandi: !!req.body.tamamlandi },
    });
    res.json(g);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/toplanti/:id/tutanak-html ───────────────────────────────────────
router.get('/:id/tutanak-html', async (req, res) => {
  try {
    const t = await prisma.toplanti.findUnique({
      where: { id: +req.params.id },
      include: {
        katilimcilar: { orderBy: [{ ilce: 'asc' }, { ad: 'asc' }] },
        gundemler: { orderBy: { sira: 'asc' } },
      },
    });
    if (!t) return res.status(404).send('<h1>Toplantı bulunamadı</h1>');

    const tarihFmt = (d) => new Date(d).toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric', weekday: 'long',
    });

    const gundemRows = (t.gundemler || []).map(g =>
      `<tr><td>${g.sira}</td><td>${g.konu}</td><td>${g.aciklama || ''}</td><td>${g.sure ? g.sure + ' dk' : ''}</td></tr>`
    ).join('');

    const katilimciRows = (t.katilimcilar || []).map(k =>
      `<tr><td>${k.ad}</td><td>${k.ilce || ''}</td><td>${k.mahalle || ''}</td><td class="imza-cell"></td></tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>Toplantı Tutanağı — ${t.baslik}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; background: #fff; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 20mm 15mm; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 14px; }
  .header .kurum { font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
  .header .daire { font-size: 11pt; margin-top: 4px; }
  .header .baslik { font-size: 16pt; font-weight: bold; margin-top: 12px; text-transform: uppercase; letter-spacing: 2px; }
  .bilgi-tablo { width: 100%; border-collapse: collapse; margin: 18px 0; }
  .bilgi-tablo td { padding: 6px 10px; border: 1px solid #999; font-size: 11pt; }
  .bilgi-tablo td:first-child { font-weight: bold; background: #f5f5f5; width: 35%; }
  .section-title { font-size: 12pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 20px 0 10px; letter-spacing: 0.5px; }
  table.data { width: 100%; border-collapse: collapse; font-size: 10.5pt; margin-bottom: 16px; }
  table.data th { background: #f0f0f0; font-weight: bold; text-align: left; padding: 7px 8px; border: 1px solid #999; }
  table.data td { padding: 7px 8px; border: 1px solid #ccc; vertical-align: top; }
  table.data tr:nth-child(even) td { background: #fafafa; }
  .imza-cell { width: 80px; min-height: 32px; }
  .imza-alani { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .imza-kutu { text-align: center; }
  .imza-cizgi { border-bottom: 1px solid #000; margin-top: 40px; margin-bottom: 6px; }
  .imza-label { font-size: 10.5pt; }
  .muhur { text-align: center; margin-top: 30px; border: 2px dashed #aaa; padding: 16px; font-size: 10pt; color: #666; border-radius: 4px; }
  .not-box { border: 1px solid #ccc; padding: 10px 14px; margin: 8px 0; font-size: 11pt; min-height: 40px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
    .page { padding: 15mm 12mm; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="kurum">Muğla Büyükşehir Belediyesi</div>
    <div class="daire">Muhtarlıklar Dairesi Başkanlığı</div>
    <div class="baslik">Toplantı Tutanağı</div>
  </div>

  <table class="bilgi-tablo">
    <tr><td>Toplantı Adı</td><td>${t.baslik}</td></tr>
    <tr><td>Tarih / Saat</td><td>${tarihFmt(t.tarih)} — ${t.saat}</td></tr>
    <tr><td>Yer</td><td>${t.yer || '—'}</td></tr>
    <tr><td>Toplantı Türü</td><td>${t.tip === 'muhtarlar' ? 'Muhtarlar Toplantısı' : t.tip === 'daire' ? 'Daire Toplantısı' : 'Karma Toplantı'}</td></tr>
    <tr><td>Durum</td><td>${t.durum === 'planli' ? 'Planlandı' : t.durum === 'tamamlandi' ? 'Tamamlandı' : 'İptal'}</td></tr>
    ${t.aciklama ? `<tr><td>Açıklama</td><td>${t.aciklama}</td></tr>` : ''}
  </table>

  ${t.gundemler?.length > 0 ? `
  <div class="section-title">Gündem Maddeleri</div>
  <table class="data">
    <thead><tr><th>#</th><th>Konu</th><th>Açıklama</th><th>Süre</th></tr></thead>
    <tbody>${gundemRows}</tbody>
  </table>` : ''}

  ${t.not ? `
  <div class="section-title">Toplantı Notları / Kararlar</div>
  <div class="not-box">${t.not.replace(/\n/g, '<br>')}</div>` : ''}

  <div class="section-title">Katılımcılar ve İmza Tablosu</div>
  <table class="data">
    <thead><tr><th>Ad Soyad</th><th>İlçe</th><th>Mahalle</th><th>İmza</th></tr></thead>
    <tbody>${katilimciRows}</tbody>
  </table>

  <div class="imza-alani">
    <div class="imza-kutu">
      <div class="imza-cizgi"></div>
      <div class="imza-label"><strong>Toplantıyı Yöneten</strong><br>Ad Soyad / Unvan</div>
    </div>
    <div class="imza-kutu">
      <div style="text-align:center; border: 1.5px solid #bbb; padding: 20px 10px; font-size: 10pt; color: #666; border-radius: 4px; min-height: 70px; display: flex; align-items: center; justify-content: center;">
        Muğla Büyükşehir Belediyesi<br>Resmi Mühür
      </div>
    </div>
  </div>

</div>

<div class="no-print" style="position:fixed;bottom:16px;right:16px;display:flex;gap:10px;">
  <button onclick="window.print()" style="padding:10px 22px;background:#43DC80;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(67,220,128,.4);">
    🖨️ PDF Olarak Kaydet
  </button>
</div>

</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/toplanti/:id/tutanak-yukle ─────────────────────────────────────
router.post('/:id/tutanak-yukle', tutanakUpload.single('dosya'), async (req, res) => {
  try {
    const id = +req.params.id;
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenemedi' });

    // Eski dosyayı sil
    const mevcut = await prisma.toplanti.findUnique({ where: { id }, select: { tutanakDosya: true } });
    if (mevcut?.tutanakDosya) {
      const eskiYol = path.join(TUTANAK_DIR, mevcut.tutanakDosya);
      if (fs.existsSync(eskiYol)) fs.unlinkSync(eskiYol);
    }

    const t = await prisma.toplanti.update({
      where: { id },
      data: {
        tutanakDosya:    req.file.filename,
        tutanakYukleme:  new Date(),
        tutanakYukleyen: req.user?.username || 'sistem',
      },
    });

    logIslem({ kullanici: req.user?.username, kullaniciAd: req.user?.displayName,
      islem: 'UPDATE', modul: 'toplanti', kayitId: String(id),
      detay: { dosya: req.file.filename, aciklama: 'İmzalı tutanak yüklendi' } });

    res.json({ ok: true, dosya: req.file.filename, tarih: t.tutanakYukleme });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/toplanti/:id/tutanak ─────────────────────────────────────────
router.delete('/:id/tutanak', async (req, res) => {
  try {
    const id = +req.params.id;
    const mevcut = await prisma.toplanti.findUnique({ where: { id }, select: { tutanakDosya: true } });
    if (mevcut?.tutanakDosya) {
      const yol = path.join(TUTANAK_DIR, mevcut.tutanakDosya);
      if (fs.existsSync(yol)) fs.unlinkSync(yol);
    }
    await prisma.toplanti.update({
      where: { id },
      data: { tutanakDosya: null, tutanakYukleme: null, tutanakYukleyen: null },
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
