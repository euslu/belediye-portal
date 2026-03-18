'use strict';
/**
 * ManageEngine ServiceDesk Plus (SDP) Entegrasyon Servisi
 * URL:  https://epc.mugla.bel.tr:8383
 * Auth: Authorization: <api_key>  (Bearer değil, direkt key)
 * API:  v3 JSON
 */

const prisma = require('../lib/prisma');

async function getSdpConfig() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['sdp_url', 'sdp_api_key', 'sdp_enabled'] } },
  });
  const m = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    url:     (m.sdp_url     || '').replace(/\/$/, ''),
    apiKey:  m.sdp_api_key  || '',
    enabled: m.sdp_enabled  === 'true',
  };
}

function buildHeaders(apiKey) {
  return {
    'Accept':        'application/vnd.manageengine.sdp.v3+json',
    'Authorization': apiKey,
    'Content-Type':  'application/x-www-form-urlencoded',
  };
}

async function testConnection(overrideCfg = null) {
  const cfg = overrideCfg || await getSdpConfig();
  if (!cfg.url)    throw new Error('SDP URL tanımlanmamış');
  if (!cfg.apiKey) throw new Error('API Key tanımlanmamış');

  const inputData = encodeURIComponent(JSON.stringify({
    list_info: { row_count: 1, start_index: 1 },
  }));
  const url = `${cfg.url}/api/v3/requests?input_data=${inputData}`;

  const res  = await fetch(url, { headers: buildHeaders(cfg.apiKey) });
  const data = await res.json();

  const status = data.response_status?.status_code;
  if (status === 4000) throw new Error('API key geçersiz veya yetkisiz');
  if (!res.ok && status !== 2000) throw new Error(`HTTP ${res.status}: ${data.response_status?.messages?.[0]?.message || 'Bilinmeyen hata'}`);

  const total = data.list_info?.total_count ?? 0;
  return { success: true, message: `Bağlantı başarılı — ${total} talep`, totalRequests: total };
}

module.exports = { testConnection, getSdpConfig };
