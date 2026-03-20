'use strict';
/**
 * ManageEngine Endpoint Central (EPC) Entegrasyon Servisi
 *
 * Çalışan API endpoint'leri (v1.4):
 *   GET /api/1.4/som/computers        → yönetilen bilgisayarlar (1689)
 *   GET /api/1.4/inventory/hardware   → aggregate donanım listesi (tipler)
 *   GET /api/1.4/patch/allsystems     → patch/güncelleme durumu
 *
 * Per-bilgisayar RAM/CPU: API desteklemiyor (lisans kısıtlaması)
 * Mevcut alanlar: name, IP, MAC, OS, owner(AD user), branch, serviceTag, liveStatus
 * URL:  https://epc.mugla.bel.tr:8383
 * Auth: Authorization: <api_key>  (Bearer değil, direkt key)
 * API:  v1.4
 *
 * Çalışan endpoint'ler:
 *   GET /api/1.4/som/computers        → 1689 yönetilen bilgisayar
 *   GET /api/1.4/inventory/hardware   → donanım envanteri
 *   GET /api/1.4/patch/allsystems     → patch durumu
 */

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'; // self-signed cert

const BASE     = process.env.SDP_URL     || 'https://epc.mugla.bel.tr:8383';
const API_KEY  = process.env.SDP_API_KEY || '';

function headers() {
  return { 'Authorization': API_KEY, 'Accept': 'application/json' };
}

async function epcGet(path, params = {}) {
  const qs  = new URLSearchParams(params).toString();
  const url = `${BASE}${path}${qs ? '?' + qs : ''}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`EPC HTTP ${res.status}: ${url}`);
  const data = await res.json();
  if (data.status === 'error') throw new Error(`EPC API hata: ${data.error_description} (${data.error_code})`);
  return data;
}

// ─── Bağlantı testi ──────────────────────────────────────────────────────────
async function testConnection(overrideCfg = null) {
  if (overrideCfg?.apiKey) {
    // Geçici olarak override ile test et
    const tmpKey = overrideCfg.apiKey;
    const tmpBase = overrideCfg.url || BASE;
    const url = `${tmpBase}/api/1.4/som/computers?page=1&pagelimit=1`;
    const res = await fetch(url, { headers: { 'Authorization': tmpKey, 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status === 'error') throw new Error(data.error_description || 'API hatası');
    const total = data.message_response?.total ?? 0;
    return { success: true, message: `Bağlantı başarılı — ${total} yönetilen bilgisayar`, total };
  }

  if (!API_KEY) throw new Error('SDP_API_KEY tanımlanmamış');
  const data  = await epcGet('/api/1.4/som/computers', { page: 1, pagelimit: 1 });
  const total = data.message_response?.total ?? 0;
  return { success: true, message: `Bağlantı başarılı — ${total} yönetilen bilgisayar`, total };
}

// ─── Bilgisayar listesi (sayfalı) ────────────────────────────────────────────
async function getComputers({ page = 1, pagelimit = 100 } = {}) {
  const data = await epcGet('/api/1.4/som/computers', { page, pagelimit });
  const raw  = data.message_response?.computers || [];
  const total = data.message_response?.total ?? 0;

  const computers = raw.map(normalizeComputer);
  return { computers, total, page, pagelimit };
}

// ─── Tüm bilgisayarları çek (otomatik sayfalama) ────────────────────────────
async function getAllComputers() {
  const PAGE_SIZE = 200;
  const first  = await getComputers({ page: 1, pagelimit: PAGE_SIZE });
  const total  = first.total;
  const all    = [...first.computers];

  const pages = Math.ceil(total / PAGE_SIZE);
  for (let p = 2; p <= pages; p++) {
    const batch = await getComputers({ page: p, pagelimit: PAGE_SIZE });
    all.push(...batch.computers);
  }
  return all;
}

// ─── Patch durumu özeti ───────────────────────────────────────────────────────
async function getPatchSummary({ page = 1, pagelimit = 100 } = {}) {
  const data = await epcGet('/api/1.4/patch/allsystems', { page, pagelimit });
  return {
    total: data.message_response?.total ?? 0,
    systems: (data.message_response?.allsystems || []).map(s => ({
      resourceId:         s.resource_id,
      name:               s.resource_name,
      ip:                 s.ip_address,
      missingPatches:     (s.missing_ms_patches || 0) + (s.missing_tp_patches || 0),
      criticalPatches:    s.critical_patch_count || 0,
      lastPatchedTime:    s.last_patched_time,
      lastScanTime:       s.last_scan_time,
      healthStatus:       s.resource_health_status,
    })),
  };
}

// ─── Normalize: EPC alanları → iç format ─────────────────────────────────────
function normalizeComputer(c) {
  return {
    resourceId:      c.resource_id,
    name:            c.resource_name || c['managedcomputer.friendly_name'] || '',
    fqdn:            c.fqdn_name || '',
    ipAddress:       c.ip_address || '',
    macAddress:      c.mac_address || '',
    osName:          c.os_name || '',
    osPlatform:      c.os_platform_name || '',
    servicepack:     c.service_pack || '',
    owner:           c.owner || '',          // AD username
    ownerFullName:   c.full_name || '',      // Tam ad
    ownerEmail:      c.owner_email_id || '',
    location:        c.location || '',
    branchOffice:    c.branch_office_name || '',
    serviceTag:      (c['managedcomputerextn.service_tag'] || '').replace(/%20/g, ' ').replace(/%[0-9A-Fa-f]{2}/g, ''),
    liveStatus:      c.computer_live_status,   // 1=online, 2=offline
    agentLastContact: c.agent_last_contact_time,
    agentVersion:    c.agent_version || '',
    domain:          c.domain_netbios_name || '',
    description:     c.description || '',
  };
}

// ─── Tek bilgisayar detayı ────────────────────────────────────────────────────
async function getComputerDetail(resourceId) {
  const data = await epcGet(`/api/1.4/som/computers/${resourceId}`);
  const raw  = data.message_response?.computers?.[0] || data.message_response;
  return raw ? normalizeComputer(raw) : null;
}

// ─── EPC → Envanter Sync ──────────────────────────────────────────────────────
/**
 * EPC'deki bilgisayarları Prisma Device tablosuna senkronize eder.
 * Eşleşme: önce MAC adresi, sonra bilgisayar adı.
 * Sonuç: { created, updated, skipped, errors }
 */
async function syncToInventory() {
  const prisma = require('../lib/prisma');

  console.log('[EPC Sync] Başlıyor...');
  const computers = await getAllComputers();
  console.log(`[EPC Sync] ${computers.length} bilgisayar alındı`);

  let created = 0, updated = 0, skipped = 0, errors = 0;
  const log   = [];

  for (const c of computers) {
    if (!c.name || c.name === '--') { skipped++; continue; }

    try {
      // Mevcut cihazı bul (önce MAC, sonra isim)
      let existing = null;
      if (c.macAddress && c.macAddress !== '--') {
        existing = await prisma.device.findFirst({ where: { macAddress: c.macAddress, active: true } });
      }
      if (!existing) {
        existing = await prisma.device.findFirst({ where: { name: c.name, active: true } });
      }

      // Durum → DeviceStatus
      const status = c.liveStatus === 1 ? 'ACTIVE' : 'PASSIVE';

      // Seri no: URL decode ve VMware UUID'leri temizle
      let serialNumber = c.serviceTag || null;
      if (serialNumber && (serialNumber.includes('VMware') || serialNumber.length > 40)) {
        serialNumber = null;
      }

      // Owner: "--" ise null
      const assignedTo = (c.owner && c.owner !== '--') ? c.owner.toLowerCase() : null;

      // Directorate: branch_office_name "Local Office" ise boş bırak
      const directorate = (c.branchOffice && c.branchOffice !== '--' && c.branchOffice !== 'Local Office')
        ? c.branchOffice : null;

      // OS notu
      const notes = [c.osName, c.servicepack].filter(v => v && v !== '--').join(' | ') || null;

      const deviceData = {
        name:         c.name,
        type:         'BILGISAYAR',
        ipAddress:    (c.ipAddress && c.ipAddress !== '--') ? c.ipAddress : null,
        macAddress:   (c.macAddress && c.macAddress !== '--') ? c.macAddress : null,
        serialNumber,
        status,
        assignedTo,
        directorate,
        notes,
        lastSyncAt:   new Date(),
        isShared:     false,
      };

      if (existing) {
        await prisma.device.update({ where: { id: existing.id }, data: deviceData });
        updated++;
        log.push({ action: 'updated', name: c.name, ip: c.ipAddress });
      } else {
        await prisma.device.create({ data: { ...deviceData, active: true } });
        created++;
        log.push({ action: 'created', name: c.name, ip: c.ipAddress });
      }
    } catch(err) {
      errors++;
      console.error(`[EPC Sync] ${c.name} hatası:`, err.message);
    }
  }

  const result = { created, updated, skipped, errors, total: computers.length };
  console.log(`[EPC Sync] Tamamlandı:`, result);
  return result;
}

module.exports = {
  testConnection,
  getComputers,
  getAllComputers,
  getPatchSummary,
  getComputerDetail,
  normalizeComputer,
  syncToInventory,
};
