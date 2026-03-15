const { Client } = require('ldapts');
const prisma      = require('./prisma');
const { sendMail } = require('./mailer');
const { template } = require('./notifications');
const { resolveDirectorate } = require('./directorateMap');

const AD_URL      = process.env.AD_URL      || 'ldap://localhost';
const AD_BASE_DN  = process.env.AD_BASE_DN  || 'dc=example,dc=com';
const AD_USERNAME = process.env.AD_USERNAME || '';
const AD_PASSWORD = process.env.AD_PASSWORD || '';
const AD_DOMAIN   = process.env.AD_DOMAIN   || '';
const ADMIN_EMAIL = process.env.NOTIFY_ADMIN_EMAIL || 'bilgislem@mugla.bel.tr';
const APP_URL     = process.env.APP_URL || 'http://localhost:5173';

const CHANGE_LABELS = {
  DEPARTMENT_CHANGE: 'Departman Değişikliği',
  LEFT_COMPANY:      'Kurumdan Ayrılma',
  TITLE_CHANGE:      'Unvan Değişikliği',
};

// ─── AD'den tüm kullanıcıları çek ─────────────────────────────────────────────
async function fetchAdUsers() {
  const client = new Client({ url: AD_URL, strictDN: false });
  try {
    const bindUser = AD_USERNAME.includes('@') ? AD_USERNAME : `${AD_USERNAME}@${AD_DOMAIN}`;
    await client.bind(bindUser, AD_PASSWORD);

    const { searchEntries } = await client.search(AD_BASE_DN, {
      scope:      'sub',
      filter:     '(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))',
      attributes: ['sAMAccountName', 'displayName', 'mail', 'department', 'title'],
      paged:      true,
      sizeLimit:  0,
    });

    return searchEntries.map((e) => {
      const raw = e.department ? String(e.department) : null;
      const { directorate, department } = resolveDirectorate(raw);
      return {
        username:    (e.sAMAccountName || '').toLowerCase(),
        displayName: e.displayName || '',
        email:       e.mail        || null,
        directorate,
        department,
        title:       e.title       || null,
      };
    }).filter((u) => u.username);
  } finally {
    await client.unbind().catch(() => {});
  }
}

// ─── Kullanıcının cihazlarını getir ───────────────────────────────────────────
async function getUserDevices(username) {
  return prisma.userDevice.findMany({ where: { username, active: true } });
}

// ─── Değişiklik bildirimi e-postası ───────────────────────────────────────────
async function sendChangeNotification(changes) {
  if (changes.length === 0) return;

  const rows = changes.map((c) => {
    const label = CHANGE_LABELS[c.changeType] || c.changeType;
    const detail = c.changeType === 'LEFT_COMPANY'
      ? `<span style="color:#dc2626">Artık AD'de bulunamıyor</span>`
      : `<span style="color:#64748b">${c.oldValue || '—'}</span>
         → <strong style="color:#1d4ed8">${c.newValue || '—'}</strong>`;
    return `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0">${c.displayName}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#64748b">${c.username}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0">${label}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0">${detail}</td>
      </tr>`;
  }).join('');

  const html = template({
    title: `AD Personel Değişiklik Raporu — ${new Date().toLocaleDateString('tr-TR')}`,
    body: `
      <p style="color:#475569;margin:0 0 16px">
        Bugün <strong>${changes.length}</strong> personel kaydında değişiklik tespit edildi.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"
        style="border-collapse:collapse;font-size:13px;margin-bottom:24px">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="padding:8px;text-align:left;color:#475569">Ad Soyad</th>
            <th style="padding:8px;text-align:left;color:#475569">Kullanıcı Adı</th>
            <th style="padding:8px;text-align:left;color:#475569">Değişiklik</th>
            <th style="padding:8px;text-align:left;color:#475569">Detay</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:0">
        <a href="${APP_URL}/admin/ad-changes"
          style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;
                 padding:10px 20px;border-radius:6px;font-size:14px;font-weight:bold">
          Tüm Değişiklikleri Görüntüle →
        </a>
      </p>`,
  });

  await sendMail({
    to:      ADMIN_EMAIL,
    subject: `[Portal] AD Personel Değişiklik Raporu — ${changes.length} değişiklik`,
    html,
  });
}

// ─── Değişiklik için otomatik ticket ──────────────────────────────────────────
async function createChangeTicket(change, devices) {
  // Sistemi temsil eden admin kullanıcıyı bul veya oluştur
  const systemUser = await prisma.user.upsert({
    where:  { username: 'system' },
    update: {},
    create: { username: 'system', displayName: 'Sistem', role: 'admin' },
  });

  const deviceList = devices.length > 0
    ? `\n\nKayıtlı Cihazlar:\n${devices.map((d) => `- ${d.deviceName} (${d.deviceType}${d.serialNumber ? ', S/N: ' + d.serialNumber : ''})`).join('\n')}`
    : '';

  let title, description;
  if (change.changeType === 'LEFT_COMPANY') {
    title       = `Ayrılan Personel: ${change.displayName}`;
    description = `${change.displayName} (${change.username}) Active Directory'de artık bulunamıyor.\n\nLütfen kullanıcının erişimlerini ve zimmetli cihazlarını kontrol ediniz.${deviceList}`;
  } else if (change.changeType === 'DEPARTMENT_CHANGE') {
    title       = `Departman Değişikliği: ${change.displayName}`;
    description = `${change.displayName} (${change.username}) departman değişikliği:\n${change.oldValue || '—'} → ${change.newValue || '—'}\n\nLütfen kullanıcının erişim yetkilerini güncelleyiniz.${deviceList}`;
  } else {
    title       = `Unvan Değişikliği: ${change.displayName}`;
    description = `${change.displayName} (${change.username}) unvan değişikliği:\n${change.oldValue || '—'} → ${change.newValue || '—'}${deviceList}`;
  }

  await prisma.ticket.create({
    data: {
      title,
      description,
      status:      'OPEN',
      type:        'CHANGE',
      priority:    change.changeType === 'LEFT_COMPANY' ? 'HIGH' : 'MEDIUM',
      createdById: systemUser.id,
    },
  });
}

// ─── Ana senkronizasyon fonksiyonu ────────────────────────────────────────────
async function runAdSync() {
  console.log('[AD Sync] Başlıyor...');

  let adUsers;
  try {
    adUsers = await fetchAdUsers();
  } catch (err) {
    console.error('[AD Sync] LDAP bağlantı hatası:', err.message);
    throw err;
  }

  console.log(`[AD Sync] ${adUsers.length} AD kullanıcısı alındı`);

  // DB kullanıcılarını çek (sistem ve dış kullanıcılar hariç)
  const dbUsers = await prisma.user.findMany({
    where: { username: { not: 'system' }, department: { not: 'Dış Kullanıcı' } },
    select: { id: true, username: true, displayName: true, department: true, title: true },
  });

  const adMap = new Map(adUsers.map((u) => [u.username, u]));
  const changes = [];

  for (const dbUser of dbUsers) {
    const adUser = adMap.get(dbUser.username);

    if (!adUser) {
      // Kullanıcı AD'de yok → ayrılmış
      const log = await prisma.adChangeLog.create({
        data: {
          username:    dbUser.username,
          displayName: dbUser.displayName,
          changeType:  'LEFT_COMPANY',
          oldValue:    dbUser.department || null,
          newValue:    null,
        },
      });
      const devices = await getUserDevices(dbUser.username);
      await createChangeTicket(log, devices);
      changes.push(log);
      continue;
    }

    // Departman değişikliği (directorate bazında karşılaştır)
    if (adUser.directorate && dbUser.department !== adUser.department) {
      const log = await prisma.adChangeLog.create({
        data: {
          username:    dbUser.username,
          displayName: dbUser.displayName,
          changeType:  'DEPARTMENT_CHANGE',
          oldValue:    dbUser.department || null,
          newValue:    adUser.department,
        },
      });
      await prisma.user.update({
        where: { username: dbUser.username },
        data:  { department: adUser.department, directorate: adUser.directorate },
      });
      const devices = await getUserDevices(dbUser.username);
      await createChangeTicket(log, devices);
      changes.push(log);
    }

    // Unvan değişikliği
    if (adUser.title && dbUser.title !== adUser.title) {
      const log = await prisma.adChangeLog.create({
        data: {
          username:    dbUser.username,
          displayName: dbUser.displayName,
          changeType:  'TITLE_CHANGE',
          oldValue:    dbUser.title || null,
          newValue:    adUser.title,
        },
      });
      await prisma.user.update({
        where: { username: dbUser.username },
        data:  { title: adUser.title },
      });
      changes.push(log);
    }
  }

  // Yeni AD kullanıcılarını DB'ye upsert et (Personel sayfası için)
  let upserted = 0;
  for (const adUser of adUsers) {
    if (!adUser.username) continue;
    try {
      await prisma.user.upsert({
        where:  { username: adUser.username },
        update: {
          displayName: adUser.displayName || adUser.username,
          email:       adUser.email       || undefined,
          directorate: adUser.directorate || undefined,
          department:  adUser.department  || undefined,
          title:       adUser.title       || undefined,
        },
        create: {
          username:    adUser.username,
          displayName: adUser.displayName || adUser.username,
          email:       adUser.email       || null,
          directorate: adUser.directorate || null,
          department:  adUser.department  || null,
          title:       adUser.title       || null,
          role:        'user',
        },
      });
      upserted++;
    } catch { /* tek kullanıcı hatası tüm sync'i durdurmasın */ }
  }
  console.log(`[AD Sync] ${upserted} kullanıcı upsert edildi`);

  console.log(`[AD Sync] ${changes.length} değişiklik tespit edildi`);

  if (changes.length > 0) {
    await sendChangeNotification(changes).catch((e) =>
      console.error('[AD Sync] E-posta gönderilemedi:', e.message)
    );
  }

  return changes;
}

module.exports = { runAdSync };
