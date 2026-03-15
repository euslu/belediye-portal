'use strict';

/**
 * ulakBELL API Servisi — READ ONLY
 * Docs: https://api.ulakbell.com/
 */

const BASE  = () => (process.env.ULAKBELL_URL || '').replace(/\/$/, '');
const TOKEN = () => process.env.ULAKBELL_TOKEN || '';

function headers() {
  return {
    Accept:        'application/json',
    Authorization: `Bearer ${TOKEN()}`,
  };
}

function checkConfig() {
  if (!BASE() || !TOKEN()) throw new Error('ulakBELL yapılandırılmamış (URL veya TOKEN eksik)');
}

// ─── Başvuruları listele ──────────────────────────────────────────────────────
// GET /api/incident?resource=all&show_all_incidents=1&count=20&page=1&...
async function getIncidents({
  page = 1, count = 20,
  status, department_id, topic_id,
  number, mobile_phone,
} = {}) {
  checkConfig();

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

  const res = await fetch(`${BASE()}/api/incident?${params}`, { headers: headers() });
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`ulakBELL ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

// ─── Tek başvuru detayı ───────────────────────────────────────────────────────
// GET /api/incident/{public_token}
async function getIncident(publicToken) {
  checkConfig();
  if (!publicToken) throw new Error('public_token gerekli');

  const res = await fetch(`${BASE()}/api/incident/${publicToken}`, { headers: headers() });
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`ulakBELL ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

// ─── Bağlantı testi ───────────────────────────────────────────────────────────
async function testConnection() {
  try {
    checkConfig();
    const res = await fetch(
      `${BASE()}/api/incident?resource=all&count=1&show_all_incidents=1`,
      { headers: headers() }
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

module.exports = { getIncidents, getIncident, testConnection };
