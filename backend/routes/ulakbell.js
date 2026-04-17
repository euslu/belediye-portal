'use strict';

const express  = require('express');
const prisma   = require('../lib/prisma');
const auth     = require('../middleware/authMiddleware');
const ub       = require('../services/ulakbell');
const logger   = require('../utils/logger');

const router = express.Router();
router.use(auth);

// ─── Yardımcı ─────────────────────────────────────────────────────────────────
function isManagerOrAdmin(req) {
  const rol = req.user?.sistemRol || req.user?.role;
  return ['admin', 'manager', 'daire_baskani', 'mudur'].includes(rol);
}

async function ulakbellRequest(method, path, body = null) {
  const cfg = await ub.getConfig();
  if (!cfg.base || !cfg.token) throw new Error('ulakBELL API yapılandırılmamış');

  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept:        'application/json',
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const r = await fetch(`${cfg.base}${path}`, opts);
  if (!r.ok) {
    const txt = await r.text().catch(() => r.statusText);
    throw new Error(`ulakBELL ${r.status}: ${txt.slice(0, 200)}`);
  }
  return r.json();
}

// ─── Birim cache (5 dakika) ──────────────────────────────────────────────────
let _birimCache = null, _birimCacheTime = 0;
async function getBirimlerCached() {
  if (_birimCache && Date.now() - _birimCacheTime < 5 * 60 * 1000) return _birimCache;
  _birimCache = await ulakbellRequest('GET', '/api/department/list');
  _birimCacheTime = Date.now();
  return _birimCache;
}

// Portal daire adını ulakBELL birim ID'sine eşle
function daireToUlakBellId(birimler, portalDaire) {
  if (!portalDaire) return null;
  // Tam eşleşme
  const tam = birimler.find(b => b.title === portalDaire);
  if (tam) return tam.id;
  // Kısmi: "Bilgi İşlem Dairesi Başkanlığı" → "bilgi işlem"
  const temiz = portalDaire
    .replace(/Dairesi Başkanlığı|Daire Başkanlığı|Başkanlığı|Dairesi/gi, '')
    .replace(/Şube Müdürlüğü|Müdürlüğü/gi, '')
    .trim().toLowerCase();
  if (!temiz) return null;
  const kismi = birimler.find(b => b.title.toLowerCase().includes(temiz));
  return kismi?.id || null;
}

// ─── Config (frontend doğrudan ulakBELL'e bağlanacak) ────────────────────────
// GET /api/ulakbell/config
router.get('/config', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });
  try {
    const cfg = await ub.getConfig();
    if (!cfg.base || !cfg.token) return res.status(400).json({ error: 'ulakBELL yapılandırılmamış' });
    res.json({ base: cfg.base, token: cfg.token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === BAŞVURU ENDPOINT'LERİ ===

// Başvuruları listele — rol bazlı otomatik filtre
// GET /api/ulakbell/basvurular?count=20&page=1&status=new&department_id=1&topic_id=5&q=123
router.get('/basvurular', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });
  try {
    const { count = 20, page = 1, status, department_id, topic_id, q } = req.query;
    const rol = req.user?.sistemRol || req.user?.role;

    // Rol bazlı departman filtresi
    let hedefDeptId = (department_id && department_id !== 'all') ? department_id : null;

    if (!hedefDeptId && rol !== 'admin') {
      const birimler = await getBirimlerCached();
      if (rol === 'daire_baskani' && req.user?.directorate) {
        hedefDeptId = daireToUlakBellId(birimler, req.user.directorate);
      } else if (rol === 'mudur' && (req.user?.department || req.user?.directorate)) {
        hedefDeptId = daireToUlakBellId(birimler, req.user.department || req.user.directorate);
      }
    }

    let url = `/api/incident?resource=all&count=${count}&show_all_incidents=1&page=${page}`;
    if (status && status !== 'all') url += `&status[]=${status}`;
    if (hedefDeptId) url += `&department_id[]=${hedefDeptId}`;
    if (topic_id && topic_id !== 'all') url += `&topic_id[]=${topic_id}`;
    if (q) url += `&number=${q}`;

    const data = await ulakbellRequest('GET', url);
    // meta bilgisi ekle
    res.json({
      ...data,
      _meta: { rol, filtrelenenDaire: req.user?.directorate, ulakBellDeptId: hedefDeptId },
    });
  } catch (err) {
    logger.error('[ulakBELL] basvurular:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// Başvuru detayı
// GET /api/ulakbell/basvurular/:token
router.get('/basvurular/:token', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });
  try {
    res.json(await ulakbellRequest('GET', `/api/incident/${req.params.token}`));
  } catch (err) {
    logger.error('[ulakBELL] basvuru detay:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// Başvuru oluştur
// POST /api/ulakbell/basvurular
router.post('/basvurular', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });
  try {
    res.json(await ulakbellRequest('POST', '/api/incident', req.body));
  } catch (err) {
    logger.error('[ulakBELL] basvuru olustur:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// Başvuru aktar (eski uyumluluk)
// PUT /api/ulakbell/basvurular/:token/aktar
router.put('/basvurular/:token/aktar', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });
  try {
    const body = {
      action:      'transfer',
      text:        req.body.text,
      additional:  req.body.additional,
      attachments: req.body.attachments || [],
    };
    res.json(await ulakbellRequest('PUT', `/api/incident/${req.params.token}`, body));
  } catch (err) {
    logger.error('[ulakBELL] basvuru aktar:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// Başvuru ilet (yeni — birim/konu/öncelik seçerek)
// PUT /api/ulakbell/basvurular/:token/ilet
router.put('/basvurular/:token/ilet', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });
  try {
    const { department_id, topic_id, user_id, priority, not: note } = req.body;
    if (!department_id) return res.status(400).json({ error: 'Birim seçilmeli' });

    const body = {
      action:      'transfer',
      text:        note || `${req.user?.displayName || 'Kullanıcı'} tarafından iletildi.`,
      additional: {
        type:          'recursive',
        department_id: +department_id,
        ...(topic_id ? { topic_id: +topic_id } : {}),
        ...(user_id  ? { user_id:  +user_id }  : {}),
        priority:      priority || 'normal',
      },
      attachments: [],
    };
    const data = await ulakbellRequest('PUT', `/api/incident/${req.params.token}`, body);
    logger.info(`[ulakBELL] Başvuru ${req.params.token} iletildi → dept:${department_id} by:${req.user?.username}`);
    res.json(data);
  } catch (err) {
    logger.error('[ulakBELL] basvuru ilet:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// Başvuru ertele
// PUT /api/ulakbell/basvurular/:token/ertele
router.put('/basvurular/:token/ertele', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });
  try {
    const body = {
      action:     'postponed',
      text:       req.body.text || '',
      additional: { postponed_to: req.body.postponed_to },
    };
    res.json(await ulakbellRequest('PUT', `/api/incident/${req.params.token}`, body));
  } catch (err) {
    logger.error('[ulakBELL] basvuru ertele:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// Başvuru kaynakları
// GET /api/ulakbell/kaynaklar
router.get('/kaynaklar', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });
  try {
    res.json(await ulakbellRequest('GET', '/api/incident_source/list'));
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// === ADRES ENDPOINT'LERİ ===

// İlçe listesi (48 = Muğla plaka kodu)
router.get('/ilceler', async (req, res) => {
  try {
    const il = req.query.il || process.env.ULAKBELL_IL_PLAKA || '48';
    res.json(await ulakbellRequest('GET', `/api/ilceList/${il}`));
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// Mahalle listesi
router.post('/mahalleler', async (req, res) => {
  try {
    res.json(await ulakbellRequest('POST', '/api/mahalleList', { ilce_id: req.body.ilce_id }));
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// Sokak listesi
router.post('/sokaklar', async (req, res) => {
  try {
    res.json(await ulakbellRequest('POST', '/api/sokakList', { mahalle_id: req.body.mahalle_id }));
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// Bina listesi
router.post('/binalar', async (req, res) => {
  try {
    res.json(await ulakbellRequest('POST', '/api/binaList', { sokak_id: req.body.sokak_id }));
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// === YÖNETİMSEL ENDPOINT'LER ===

// Birimler (cached)
router.get('/birimler', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });
  try {
    res.json(await getBirimlerCached());
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// Konular
router.get('/konular', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });
  try {
    res.json(await ulakbellRequest('GET', '/api/incident_topic/list'));
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// Kullanıcılar (sadece admin/daire_baskani)
router.get('/kullanicilar', async (req, res) => {
  const rol = req.user?.sistemRol || req.user?.role;
  if (!['admin', 'daire_baskani'].includes(rol)) return res.status(403).json({ error: 'Yetersiz yetki' });
  try {
    res.json(await ulakbellRequest('GET', '/api/user'));
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// Bağlantı testi (admin)
router.get('/test', async (req, res) => {
  const rol = req.user?.sistemRol || req.user?.role;
  if (rol !== 'admin') return res.status(403).json({ error: 'Sadece admin' });

  try {
    const cfg = await ub.getConfig();
    if (!cfg.base || !cfg.token) {
      return res.json({ bagli: false, mesaj: 'API token tanımlanmamış. Ayarlar > ulakBELL bölümünden token girin.' });
    }
    const data = await ulakbellRequest('GET', '/api/incident_source/list');
    res.json({ bagli: true, mesaj: 'ulakBELL bağlantısı başarılı', kaynak_sayisi: Array.isArray(data) ? data.length : 0 });
  } catch (e) {
    res.json({ bagli: false, mesaj: e.message });
  }
});

// ─── Ticket'ı ulakBELL'e Gönder (mevcut sync) ──────────────────────────────
// POST /api/ulakbell/sync-incident/:ticketId
router.post('/sync-incident/:ticketId', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });
  const ticketId = parseInt(req.params.ticketId);
  if (isNaN(ticketId)) return res.status(400).json({ error: 'Geçersiz ticketId' });

  const ticket = await prisma.ticket.findUnique({
    where:   { id: ticketId },
    include: { createdBy: { select: { displayName: true, email: true } } },
  });
  if (!ticket) return res.status(404).json({ error: 'Ticket bulunamadı' });

  const {
    mobile_phone, incident_type,
    ilce_id, mahalle_id, sokak_id, bina_no, adres_no,
  } = req.body;

  try {
    const body = {
      source_id:     parseInt(process.env.ULAKBELL_SOURCE_ID || '38'),
      text:          `${ticket.title}\n\n${ticket.description}`,
      incident_type: incident_type ?? (ticket.type === 'REQUEST' ? 'demand' : 'incident'),
      ...(mobile_phone ? { mobile_phone: String(mobile_phone).replace(/\D/g, '') } : {}),
      ...(ilce_id      ? { ilce_id:      +ilce_id }      : {}),
      ...(mahalle_id   ? { mahalle_id:   +mahalle_id }   : {}),
      ...(sokak_id     ? { sokak_id:     +sokak_id }     : {}),
      ...(bina_no      ? { bina_no:      +bina_no }      : {}),
      ...(adres_no     ? { adres_no:     +adres_no }     : {}),
    };

    const result = await ulakbellRequest('POST', '/api/incident', body);

    const publicToken  = result?.public_token ?? result?.data?.public_token ?? '';
    const incidentNum  = result?.number       ?? result?.data?.number       ?? null;

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ulakbellToken:  publicToken || null,
        ulakbellNumber: incidentNum  || null,
        ulakbellSentAt: new Date(),
        ulakbellStatus: 'Gönderildi',
        ...(ilce_id    ? { ilceId:    +ilce_id }    : {}),
        ...(mahalle_id ? { mahalleId: +mahalle_id } : {}),
        ...(sokak_id   ? { sokakId:   +sokak_id }   : {}),
        ...(bina_no    ? { binaId:    +bina_no }    : {}),
        ...(adres_no   ? { adresId:   +adres_no }   : {}),
      },
    });

    logger.info(`[ulakBELL] Ticket #${ticketId} → token: ${publicToken}`);
    res.json({ ok: true, public_token: publicToken, ulakbellNumber: incidentNum });
  } catch (err) {
    logger.error(`[ulakBELL] sync-incident #${ticketId}:`, err.message);
    res.status(502).json({ ok: false, error: err.message });
  }
});

// ─── Durum Sorgula ────────────────────────────────────────────────────────────
// GET /api/ulakbell/incident-status/:ticketId
router.get('/incident-status/:ticketId', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });
  const ticketId = parseInt(req.params.ticketId);
  if (isNaN(ticketId)) return res.status(400).json({ error: 'Geçersiz ticketId' });

  const ticket = await prisma.ticket.findUnique({
    where:  { id: ticketId },
    select: { id: true, ulakbellToken: true, ulakbellNumber: true, ulakbellStatus: true, ulakbellSentAt: true },
  });
  if (!ticket)               return res.status(404).json({ error: 'Ticket bulunamadı' });
  if (!ticket.ulakbellToken) return res.status(400).json({ error: "Bu ticket ulakBELL'e iletilmemiş" });

  try {
    const data   = await ulakbellRequest('GET', `/api/incident/${ticket.ulakbellToken}`);
    const status = String(data?.status ?? data?.state ?? 'Bilinmiyor');
    await prisma.ticket.update({ where: { id: ticketId }, data: { ulakbellStatus: status } });
    res.json({ ok: true, ulakbellToken: ticket.ulakbellToken, ulakbellNumber: ticket.ulakbellNumber, ulakbellSentAt: ticket.ulakbellSentAt, ulakbellStatus: status, raw: data });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

module.exports = router;
