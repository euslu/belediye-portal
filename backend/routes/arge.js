const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const prisma = require('../lib/prisma');
const multer = require('multer');
const XLSX   = require('xlsx');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function adminOnly(req, res, next) {
  const rol = req.user.sistemRol || req.user.role;
  if (rol !== 'admin') return res.status(403).json({ error: 'Sadece admin erişebilir' });
  next();
}

function yetkiKontrol(req, res, next) {
  const rol = req.user.sistemRol || req.user.role;
  if (!['admin', 'daire_baskani'].includes(rol))
    return res.status(403).json({ error: 'Yetersiz yetki' });
  next();
}

// ─── Yardımcı: string temizle ────────────────────────────────────────────────
const str = v => String(v ?? '').trim() || null;

// ─── GET /api/arge/hat-atamalari ─────────────────────────────────────────────
router.get('/hat-atamalari', auth, async (req, res) => {
  try {
    const { directorate, department, hatTipi, username } = req.query;
    const where = {
      aktif: true,
      ...(directorate && { directorate: { contains: directorate, mode: 'insensitive' } }),
      ...(department  && { department:  { contains: department,  mode: 'insensitive' } }),
      ...(hatTipi    && { hatTipi }),
      ...(username   && { username }),
    };
    const atamalar = await prisma.hatAtamasi.findMany({
      where,
      orderBy: [{ directorate: 'asc' }, { displayName: 'asc' }],
    });
    res.json(atamalar);
  } catch (e) {
    console.error('[arge/hat-atamalari]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/arge/hat-ozet ──────────────────────────────────────────────────
router.get('/hat-ozet', auth, async (req, res) => {
  try {
    const [toplamSes, toplamM2m, toplamSesData, bekleyen, daireDagilim, operatorDagilim, networkDagilim, paketDagilim] =
      await Promise.all([
        prisma.hatAtamasi.count({ where: { hatTipi: 'ses',      aktif: true } }),
        prisma.hatAtamasi.count({ where: { hatTipi: 'm2m_data', aktif: true } }),
        prisma.hatAtamasi.count({ where: { hatTipi: 'ses_data', aktif: true } }),
        prisma.hatAtamasi.count({ where: { teslimDurumu: { contains: 'EDİLMEDİ' }, aktif: true } }),
        prisma.hatAtamasi.groupBy({
          by: ['directorate'], where: { aktif: true },
          _count: { directorate: true },
          orderBy: { _count: { directorate: 'desc' } }, take: 10,
        }),
        prisma.hatAtamasi.groupBy({
          by: ['operator'], where: { aktif: true },
          _count: { operator: true },
        }),
        prisma.hatAtamasi.groupBy({
          by: ['network'], where: { aktif: true, network: { not: null } },
          _count: { network: true },
          orderBy: { _count: { network: 'desc' } },
        }),
        prisma.hatAtamasi.groupBy({
          by: ['paket'], where: { aktif: true, paket: { not: null } },
          _count: { paket: true },
          orderBy: { _count: { paket: 'desc' } },
        }),
      ]);

    res.json({
      ozet: {
        toplamSes, toplamM2m, toplamSesData, bekleyen,
        toplam: toplamSes + toplamM2m + toplamSesData,
      },
      daireDagilim:    daireDagilim.map(d => ({ ad: d.directorate, sayi: d._count.directorate })),
      operatorDagilim: operatorDagilim.map(o => ({ ad: o.operator,  sayi: o._count.operator })),
      networkDagilim:  networkDagilim.map(n => ({ ad: n.network,    sayi: n._count.network })),
      paketDagilim:    paketDagilim.map(p => ({ ad: p.paket,        sayi: p._count.paket })),
    });
  } catch (e) {
    console.error('[arge/hat-ozet]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/arge/hat-atamasi (tek kayıt) ──────────────────────────────────
router.post('/hat-atamasi', auth, yetkiKontrol, async (req, res) => {
  try {
    const atama = await prisma.hatAtamasi.create({
      data: { ...req.body, olusturan: req.user.username },
    });
    res.json(atama);
  } catch (e) {
    console.error('[arge/hat-atamasi POST]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── PUT /api/arge/hat-atamasi/:id ───────────────────────────────────────────
router.put('/hat-atamasi/:id', auth, yetkiKontrol, async (req, res) => {
  try {
    const atama = await prisma.hatAtamasi.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(atama);
  } catch (e) {
    console.error('[arge/hat-atamasi PUT]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── DELETE /api/arge/hat-atamasi/:id (soft) ─────────────────────────────────
router.delete('/hat-atamasi/:id', auth, adminOnly, async (req, res) => {
  try {
    await prisma.hatAtamasi.update({
      where: { id: parseInt(req.params.id) },
      data:  { aktif: false },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('[arge/hat-atamasi DELETE]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/arge/import/gsm-hatlar ────────────────────────────────────────
router.post('/import/gsm-hatlar', auth, adminOnly, upload.single('dosya'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenmedi' });
    const wb   = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    let eklenen = 0, guncellenen = 0;

    for (const row of rows) {
      const hatNo = str(row['GSM NO'] || row['GSM_NO'] || row['HAT NO'] || row['HATNO']);
      if (!hatNo) continue;

      const paketStr   = str(row['Paket Türü'] || row['PAKET TÜRÜ'] || row['PAKET_TURU'] || row['Paket']) || '';
      const notStr     = str(row['NOT'] || row['Not'] || row['NOTLAR']) || '';
      const pLower     = paketStr.toLowerCase();
      const hatTipi    = pLower.includes('ses data') || pLower.includes('ses+data') ? 'ses_data'
                       : pLower.includes('ses') && !pLower.includes('m2m') ? 'ses'
                       : 'm2m_data';
      const teslim     = notStr.toUpperCase().includes('TESLİM EDİLMEDİ') || notStr.toUpperCase().includes('TESLIM EDILMEDI')
                       ? 'YENİ HAT TESLİM EDİLMEDİ' : 'TESLİM EDİLDİ';

      const data = {
        displayName: str(row['Personel'] || row['PERSONEL'] || row['Kullanıcı']),
        directorate: str(row['Daire Başkanlığı'] || row['DAİRE BAŞKANLIĞI'] || row['DAIRE']),
        hatTipi,
        hatNo,
        iccid:       str(row['ICCID'] || row['GSM Hat Seri No'] || row['SIM NO']),
        paket:       paketStr || null,
        cihaz:       str(row['Cihaz'] || row['CİHAZ'] || row['CIHAZ']),
        network:     str(row['Network'] || row['NETWORK'] || row['APN']),
        ip:          str(row['IP'] || row['IP Adresi']),
        notlar:      notStr || null,
        teslimDurumu: teslim,
        aktif: true,
      };

      // hatNo ile mevcut kayıt var mı?
      const mevcut = await prisma.hatAtamasi.findFirst({ where: { hatNo, aktif: true } });
      if (mevcut) {
        await prisma.hatAtamasi.update({ where: { id: mevcut.id }, data });
        guncellenen++;
      } else {
        await prisma.hatAtamasi.create({ data: { ...data, olusturan: req.user.username } });
        eklenen++;
      }
    }

    res.json({ ok: true, eklenen, guncellenen, mesaj: `${eklenen} eklendi, ${guncellenen} güncellendi` });
  } catch (e) {
    console.error('[arge/import/gsm-hatlar]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/arge/import/cihaz-envanter ────────────────────────────────────
router.post('/import/cihaz-envanter', auth, adminOnly, upload.single('dosya'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenmedi' });
    const wb   = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    let eklenen = 0;
    const kayitlar = rows.map(row => ({
      daireBaskanlik: str(row['Daire Başkanlığı'] || row['DAİRE BAŞKANLIĞI'] || row['DAIRE']),
      kullanici:      str(row['Kullanıcı'] || row['KULLANICI'] || row['Personel']),
      cihazMarka:     str(row['Cihaz Marka'] || row['CİHAZ MARKA']),
      cihazModel:     str(row['Cihaz Model'] || row['CİHAZ MODEL']),
      cihazSeriNo:    str(row['Cihaz Seri No'] || row['SERİ NO']),
      cihazTuru:      str(row['Cihaz Türü'] || row['CİHAZ TÜRÜ'] || row['TÜR']),
      cihazImei:      str(row['Cihaz IMEI'] || row['IMEI']),
      gsmHatSeriNo:   str(row['GSM Hat Seri No'] || row['ICCID']),
      gsmHatTelNo:    str(row['GSM Hat Tel No'] || row['GSM NO'] || row['HAT NO']),
      paketTuru:      str(row['Paket Türü'] || row['PAKET TÜRÜ']),
      paketGb:        str(row['Paket GB'] || row['GB']),
    })).filter(r => r.kullanici || r.gsmHatTelNo);

    if (kayitlar.length > 0) {
      const result = await prisma.cihazEnvanter.createMany({ data: kayitlar });
      eklenen = result.count;
    }

    res.json({ ok: true, eklenen, mesaj: `${eklenen} cihaz kaydı eklendi` });
  } catch (e) {
    console.error('[arge/import/cihaz-envanter]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/arge/cihaz-envanter ────────────────────────────────────────────
router.get('/cihaz-envanter', auth, async (req, res) => {
  try {
    const { daire, cihazTuru, q } = req.query;
    const where = {
      aktif: true,
      ...(daire     && { daireBaskanlik: { contains: daire,     mode: 'insensitive' } }),
      ...(cihazTuru && { cihazTuru:      { contains: cihazTuru, mode: 'insensitive' } }),
      ...(q && {
        OR: [
          { kullanici:    { contains: q, mode: 'insensitive' } },
          { gsmHatTelNo:  { contains: q } },
          { cihazImei:    { contains: q } },
        ],
      }),
    };
    const cihazlar = await prisma.cihazEnvanter.findMany({
      where,
      orderBy: [{ daireBaskanlik: 'asc' }, { kullanici: 'asc' }],
    });
    res.json(cihazlar);
  } catch (e) {
    console.error('[arge/cihaz-envanter]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/arge/cihaz-ozet ────────────────────────────────────────────────
router.get('/cihaz-ozet', auth, async (req, res) => {
  try {
    const [toplamCihaz, turDagilim, markaDagilim, daireDagilim] = await Promise.all([
      prisma.cihazEnvanter.count({ where: { aktif: true } }),
      prisma.cihazEnvanter.groupBy({
        by: ['cihazTuru'], where: { aktif: true },
        _count: { cihazTuru: true },
        orderBy: { _count: { cihazTuru: 'desc' } },
      }),
      prisma.cihazEnvanter.groupBy({
        by: ['cihazMarka'], where: { aktif: true },
        _count: { cihazMarka: true },
        orderBy: { _count: { cihazMarka: 'desc' } },
      }),
      prisma.cihazEnvanter.groupBy({
        by: ['daireBaskanlik'], where: { aktif: true },
        _count: { daireBaskanlik: true },
        orderBy: { _count: { daireBaskanlik: 'desc' } }, take: 10,
      }),
    ]);
    res.json({
      toplamCihaz,
      turDagilim:   turDagilim.map(r => ({ ad: r.cihazTuru,      sayi: r._count.cihazTuru })),
      markaDagilim: markaDagilim.map(r => ({ ad: r.cihazMarka,    sayi: r._count.cihazMarka })),
      daireDagilim: daireDagilim.map(r => ({ ad: r.daireBaskanlik, sayi: r._count.daireBaskanlik })),
    });
  } catch (e) {
    console.error('[arge/cihaz-ozet]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/arge/personel-ara ──────────────────────────────────────────────
router.get('/personel-ara', auth, async (req, res) => {
  try {
    const { directorate, department, q } = req.query;
    const where = {
      ...(directorate && { directorate }),
      ...(department  && { department }),
      ...(q && {
        OR: [
          { displayName: { contains: q, mode: 'insensitive' } },
          { username:    { contains: q, mode: 'insensitive' } },
        ],
      }),
    };
    const personel = await prisma.user.findMany({
      where,
      select: { username: true, displayName: true, title: true, directorate: true, department: true },
      orderBy: { displayName: 'asc' },
      take: 100,
    });
    res.json(personel);
  } catch (e) {
    console.error('[arge/personel-ara]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/arge/daireler ──────────────────────────────────────────────────
router.get('/daireler', auth, async (req, res) => {
  try {
    const rows = await prisma.user.groupBy({
      by: ['directorate'],
      where: { directorate: { not: null } },
      _count: { directorate: true },
      orderBy: { directorate: 'asc' },
    });
    res.json(rows.map(d => ({ ad: d.directorate, sayi: d._count.directorate })));
  } catch (e) {
    console.error('[arge/daireler]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/arge/mudurlukleri ──────────────────────────────────────────────
router.get('/mudurlukleri', auth, async (req, res) => {
  try {
    const { directorate } = req.query;
    const rows = await prisma.user.groupBy({
      by: ['department'],
      where: { directorate, department: { not: null } },
      _count: { department: true },
      orderBy: { department: 'asc' },
    });
    res.json(rows.map(m => ({ ad: m.department, sayi: m._count.department })));
  } catch (e) {
    console.error('[arge/mudurlukleri]', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
