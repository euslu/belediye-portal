'use strict';

/**
 * ulakBELL API Servisi — READ ONLY
 * Docs: https://api.ulakbell.com/
 */

const prisma = require('../lib/prisma');

async function getConfig() {
  const envUrl = process.env.ULAKBELL_URL || '';
  const envToken = process.env.ULAKBELL_TOKEN || '';
  if (envUrl && envToken) {
    return {
      base: envUrl.replace(/\/$/, ''),
      token: envToken,
    };
  }

  const rows = await prisma.setting.findMany({
    where: { key: { in: ['ulakbell_url', 'ulakbell_token', 'ulakbell_user', 'ULAKBELL_URL', 'ULAKBELL_TOKEN', 'ULAKBELL_USER'] } },
  });
  const map = Object.fromEntries(rows.map(r => [r.key, r.value || '']));
  const base = (map.ULAKBELL_URL || map.ulakbell_url || '').replace(/\/$/, '');
  const token = map.ULAKBELL_TOKEN || map.ulakbell_token || '';
  const user = map.ULAKBELL_USER || map.ulakbell_user || '';
  return { base, token, user };
}

function headers(token) {
  return {
    Accept:        'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function checkConfig() {
  const cfg = await getConfig();
  if (!cfg.base || !cfg.token) throw new Error('ulakBELL yapılandırılmamış (URL veya TOKEN eksik)');
  return cfg;
}

// ─── Başvuruları listele ──────────────────────────────────────────────────────
// GET /api/incident?resource=all&show_all_incidents=1&count=20&page=1&...
async function getIncidents({
  page = 1, count = 20,
  status, department_id, topic_id,
  number, mobile_phone,
} = {}) {
  const cfg = await checkConfig();

  const params = new URLSearchParams({
    resource:           'all',
    show_all_incidents: 1,
    count,
    page,
  });

  if (status)        status.forEach(s => params.append('status[]', s));
  if (department_id) department_id.forEach(d => params.append('department_id[]', d));
  if (topic_id)      topic_id.forEach(t => params.append('topic_id[]', t));
  if (number)        params.set('number', number);
  if (mobile_phone)  params.set('mobile_phone', mobile_phone);

  const res = await fetch(`${cfg.base}/api/incident?${params}`, { headers: headers(cfg.token) });
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`ulakBELL ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

// ─── Tek başvuru detayı ───────────────────────────────────────────────────────
// GET /api/incident/{public_token}
async function getIncident(publicToken) {
  const cfg = await checkConfig();
  if (!publicToken) throw new Error('public_token gerekli');

  const res = await fetch(`${cfg.base}/api/incident/${publicToken}`, { headers: headers(cfg.token) });
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`ulakBELL ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

// ─── Bağlantı testi ───────────────────────────────────────────────────────────
async function testConnection() {
  try {
    const cfg = await checkConfig();
    const res = await fetch(
      `${cfg.base}/api/incident?resource=all&count=1&show_all_incidents=1`,
      { headers: headers(cfg.token) }
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText);
      return { success: false, message: `HTTP ${res.status}: ${txt.slice(0, 150)}` };
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

module.exports = { getConfig, getIncidents, getIncident, testConnection };
