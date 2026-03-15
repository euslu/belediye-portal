'use strict';

const express  = require('express');
const prisma   = require('../lib/prisma');
const auth     = require('../middleware/authMiddleware');
const ub       = require('../services/ulakbell');

const router = express.Router();
router.use(auth);

// ─── Yardımcı ─────────────────────────────────────────────────────────────────
function isManagerOrAdmin(req) {
  return ['admin', 'manager'].includes(req.user?.role);
}

// ─── Başvuru Listesi ──────────────────────────────────────────────────────────
// GET /api/ulakbell/incidents
//   ?page=1&count=20&number=X&mobile_phone=X
//   &status[]=new&status[]=pending
//   &department_id[]=1&topic_id[]=5
router.get('/incidents', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });

  const {
    page, count, number, mobile_phone,
  } = req.query;

  // Express query array: status[] → req.query['status[]'] veya req.query.status
  const toArr = (key) => {
    const v = req.query[key] || req.query[`${key}[]`];
    if (!v) return undefined;
    return Array.isArray(v) ? v : [v];
  };

  try {
    const data = await ub.getIncidents({
      page:          page  ? parseInt(page)  : 1,
      count:         count ? parseInt(count) : 20,
      number:        number       || undefined,
      mobile_phone:  mobile_phone || undefined,
      status:        toArr('status'),
      department_id: toArr('department_id'),
      topic_id:      toArr('topic_id'),
    });
    res.json(data);
  } catch (err) {
    console.error('[ulakBELL] incidents:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ─── Başvuru Detayı ───────────────────────────────────────────────────────────
// GET /api/ulakbell/incidents/:token
router.get('/incidents/:token', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });
  try {
    res.json(await ub.getIncident(req.params.token));
  } catch (err) {
    console.error('[ulakBELL] incident detail:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ─── Bağlantı Testi (admin) ───────────────────────────────────────────────────
// POST /api/ulakbell/test
router.post('/test', async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
  res.json(await ub.testConnection());
});

// ─── Ticket'ı ulakBELL'e Gönder ──────────────────────────────────────────────
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

  // ulakbell servisini doğrudan fetch ile çağır (spec'teki createIncident kaldırıldı)
  try {
    const BASE  = (process.env.ULAKBELL_URL || '').replace(/\/$/, '');
    const TOKEN = process.env.ULAKBELL_TOKEN || '';
    if (!BASE || !TOKEN) return res.status(400).json({ error: 'ulakBELL yapılandırılmamış' });

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

    const result = await fetch(`${BASE}/api/incident`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${TOKEN}` },
      body:    JSON.stringify(body),
    }).then(r => r.json());

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

    console.log(`[ulakBELL] Ticket #${ticketId} → token: ${publicToken}`);
    res.json({ ok: true, public_token: publicToken, ulakbellNumber: incidentNum });
  } catch (err) {
    console.error(`[ulakBELL] sync-incident #${ticketId}:`, err.message);
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
    const data   = await ub.getIncident(ticket.ulakbellToken);
    const status = String(data?.status ?? data?.state ?? 'Bilinmiyor');
    await prisma.ticket.update({ where: { id: ticketId }, data: { ulakbellStatus: status } });
    res.json({ ok: true, ulakbellToken: ticket.ulakbellToken, ulakbellNumber: ticket.ulakbellNumber, ulakbellSentAt: ticket.ulakbellSentAt, ulakbellStatus: status, raw: data });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

// ─── Adres Kaskad (TicketNew için) ───────────────────────────────────────────
const ULAKBELL_IL  = () => process.env.ULAKBELL_IL_PLAKA || '48';
const UB_TOKEN     = () => process.env.ULAKBELL_TOKEN || '';
const UB_BASE      = () => (process.env.ULAKBELL_URL || '').replace(/\/$/, '');

function ubFetch(path, body) {
  const base  = UB_BASE(); const token = UB_TOKEN();
  if (!base || !token) throw new Error('ulakBELL yapılandırılmamış');
  return fetch(base + path, {
    method:  body ? 'POST' : 'GET',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(r => r.json());
}

router.get('/ilceler',    async (_r, res) => { try { res.json(await ubFetch(`/api/ilceList/${ULAKBELL_IL()}`));                              } catch (e) { res.status(502).json({ error: e.message }); } });
router.get('/mahalleler', async (req, res) => { try { res.json(await ubFetch('/api/mahalleList', { ilce_id:    +req.query.ilce_id }));       } catch (e) { res.status(502).json({ error: e.message }); } });
router.get('/sokaklar',   async (req, res) => { try { res.json(await ubFetch('/api/sokakList',   { mahalle_id: +req.query.mahalle_id }));   } catch (e) { res.status(502).json({ error: e.message }); } });
router.get('/binalar',    async (req, res) => { try { res.json(await ubFetch('/api/binaList',    { sokak_id:   +req.query.sokak_id }));     } catch (e) { res.status(502).json({ error: e.message }); } });
router.get('/daireler',   async (req, res) => { try { res.json(await ubFetch('/api/binaBagimsizBolumList', { bina_no: +req.query.bina_no })); } catch (e) { res.status(502).json({ error: e.message }); } });

module.exports = router;
