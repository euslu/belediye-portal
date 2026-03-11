// ─── AD Bilgisayar Sorgulama ──────────────────────────────────────────────────
// LAPS (ms-Mcs-AdmPwd) yalnızca LDAPS veya kanalın şifrelenmesi durumunda okunur.
// Bu özellik sadece okunan attribute listesinde bırakılmıştır; erişim yoksa boş döner.

const AD_URL      = process.env.AD_URL      || 'ldap://localhost';
const AD_BASE_DN  = process.env.AD_BASE_DN  || 'dc=example,dc=com';
const AD_USERNAME = process.env.AD_USERNAME || '';
const AD_PASSWORD = process.env.AD_PASSWORD || '';
const AD_DOMAIN   = process.env.AD_DOMAIN   || '';

const AD_ATTRIBUTES = [
  'cn',
  'dNSHostName',
  'operatingSystem',
  'operatingSystemVersion',
  'operatingSystemServicePack',
  'serialNumber',
  'description',
  'managedBy',
  'lastLogonTimestamp',
  'whenCreated',
  'whenChanged',
  'distinguishedName',
  'location',
  'department',
  'ms-Mcs-AdmPwd',  // LAPS — sadece yetki varsa döner
];

// DN'den CN kısmını al: "CN=John Doe,OU=..." → "John Doe"
function parseCN(dn) {
  if (!dn) return null;
  const m = String(dn).match(/^CN=([^,]+)/i);
  return m ? m[1] : null;
}

// DN'den OU hiyerarşisini al (köke doğru): "CN=PC,OU=Muhasebe,OU=Birim,DC=..." → "Birim > Muhasebe"
function parseOU(dn) {
  if (!dn) return '';
  return String(dn)
    .split(',')
    .filter(p => p.trim().toUpperCase().startsWith('OU='))
    .map(p => p.trim().replace(/^OU=/i, ''))
    .reverse()
    .join(' > ');
}

// AD 64-bit timestamp (100ns, 1601 epoch) → JS Date
function adTimestampToDate(ts) {
  if (!ts || ts === '0' || ts === '9223372036854775807') return null;
  try {
    const n  = BigInt(ts);
    const ms = Number(n / 10000n) - 11644473600000;
    return ms > 0 ? new Date(ms) : null;
  } catch {
    return null;
  }
}

// AD generalized time "YYYYMMDDHHmmss.0Z" → JS Date
function parseAdDate(str) {
  if (!str) return null;
  const m = String(str).match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  return m ? new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`) : null;
}

function mapEntry(e) {
  const lastLogon   = adTimestampToDate(e.lastLogonTimestamp);
  const daysSince   = lastLogon ? (Date.now() - lastLogon.getTime()) / 86400000 : Infinity;

  return {
    name:         e.cn                       || '',
    dnsName:      e.dNSHostName              || null,
    os:           e.operatingSystem          || null,
    osVersion:    e.operatingSystemVersion   || null,
    osSP:         e.operatingSystemServicePack || null,
    serialNumber: e.serialNumber             || null,
    description:  e.description              || null,
    managedBy:    parseCN(e.managedBy),
    lastLogon,
    createdAt:    parseAdDate(e.whenCreated),
    changedAt:    parseAdDate(e.whenChanged),
    location:     e.location                 || null,
    department:   e.department               || null,
    ou:           parseOU(e.distinguishedName),
    inactive:     daysSince > 90,
    alreadyInInventory: false, // enriched by caller
  };
}

// ─── Gerçek LDAP sorgusu ──────────────────────────────────────────────────────
async function fetchAdComputers() {
  const { Client } = require('ldapts');
  const client = new Client({ url: AD_URL, tlsOptions: { rejectUnauthorized: false } });
  try {
    const bindUser = AD_USERNAME.includes('@') ? AD_USERNAME : `${AD_DOMAIN}\\${AD_USERNAME}`;
    await client.bind(bindUser, AD_PASSWORD);

    const { searchEntries } = await client.search(AD_BASE_DN, {
      scope:  'sub',
      filter: '(&(objectClass=computer)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))',
      attributes: AD_ATTRIBUTES,
    });

    return searchEntries.map(mapEntry);
  } finally {
    await client.unbind().catch(() => {});
  }
}

// ─── Mock veri (MOCK_AUTH=true) ───────────────────────────────────────────────
const D = (days)  => new Date(Date.now() - days * 86400000);
const H = (hours) => new Date(Date.now() - hours * 3600000);

const MOCK_COMPUTERS = [
  {
    name: 'MBB-SRV-001', dnsName: 'MBB-SRV-001.mugla.bel.tr',
    os: 'Windows Server 2019 Datacenter', osVersion: '10.0.17763', osSP: null,
    serialNumber: 'SN-SRV-001', description: 'Ana Dosya Sunucusu',
    managedBy: 'Admin Kullanıcı', lastLogon: H(1),
    createdAt: new Date('2020-01-10'), changedAt: H(1),
    location: 'Sunucu Odası B1', department: 'Bilgi İşlem',
    ou: 'Muğla BB > Bilgi İşlem Dairesi > Sunucular',
    inactive: false, alreadyInInventory: false,
  },
  {
    name: 'MBB-LAPTOP-001', dnsName: 'MBB-LAPTOP-001.mugla.bel.tr',
    os: 'Windows 10 Pro', osVersion: '10.0.19045 (22H2)', osSP: null,
    serialNumber: 'SN-LT-0042', description: 'ayse.kaya',
    managedBy: 'Ayşe Kaya', lastLogon: D(1),
    createdAt: new Date('2022-09-01'), changedAt: D(1),
    location: null, department: 'İnsan Kaynakları',
    ou: 'Muğla BB > İnsan Kaynakları',
    inactive: false, alreadyInInventory: false,
  },
  {
    name: 'MBB-PC-001', dnsName: 'MBB-PC-001.mugla.bel.tr',
    os: 'Windows 10 Pro', osVersion: '10.0.19045 (22H2)', osSP: null,
    serialNumber: 'SN-20230001', description: 'ahmet.yilmaz',
    managedBy: 'Ahmet Yılmaz', lastLogon: D(2),
    createdAt: new Date('2023-01-15'), changedAt: D(2),
    location: null, department: 'Bilgi İşlem',
    ou: 'Muğla BB > Bilgi İşlem Dairesi',
    inactive: false, alreadyInInventory: false,
  },
  {
    name: 'MBB-LAPTOP-002', dnsName: 'MBB-LAPTOP-002.mugla.bel.tr',
    os: 'Windows 11 Pro', osVersion: '10.0.22631 (23H2)', osSP: null,
    serialNumber: 'SN-LT-0078', description: 'ali.ozturk',
    managedBy: 'Ali Öztürk', lastLogon: D(3),
    createdAt: new Date('2023-08-14'), changedAt: D(3),
    location: '3. Kat', department: 'Fen İşleri',
    ou: 'Muğla BB > Fen İşleri Dairesi',
    inactive: false, alreadyInInventory: false,
  },
  {
    name: 'MBB-PC-002', dnsName: 'MBB-PC-002.mugla.bel.tr',
    os: 'Windows 11 Pro', osVersion: '10.0.22631 (23H2)', osSP: null,
    serialNumber: null, description: 'mehmet.demir',
    managedBy: null, lastLogon: D(5),
    createdAt: new Date('2023-03-20'), changedAt: D(5),
    location: 'Kat 2 - Oda 205', department: 'Muhasebe',
    ou: 'Muğla BB > Mali Hizmetler',
    inactive: false, alreadyInInventory: false,
  },
  {
    name: 'MBB-PC-004', dnsName: 'MBB-PC-004.mugla.bel.tr',
    os: 'Windows 10 Pro', osVersion: '10.0.19045 (22H2)', osSP: null,
    serialNumber: 'SN-20230042', description: 'fatma.celik',
    managedBy: 'Fatma Çelik', lastLogon: D(7),
    createdAt: new Date('2023-05-11'), changedAt: D(7),
    location: null, department: 'Park ve Bahçeler',
    ou: 'Muğla BB > Park ve Bahçeler Dairesi',
    inactive: false, alreadyInInventory: false,
  },
  {
    name: 'MBB-PC-003', dnsName: null,
    os: 'Windows 7 Professional', osVersion: '6.1.7601', osSP: 'Service Pack 1',
    serialNumber: null, description: null,
    managedBy: null, lastLogon: D(120),
    createdAt: new Date('2018-06-10'), changedAt: D(120),
    location: null, department: null,
    ou: 'Muğla BB > Eski Sistemler',
    inactive: true, alreadyInInventory: false,
  },
];

module.exports = { fetchAdComputers, MOCK_COMPUTERS };
