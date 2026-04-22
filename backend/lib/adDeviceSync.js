// ─── AD Cihaz Senkronizasyonu ─────────────────────────────────────────────────
const { fetchAdComputers, MOCK_COMPUTERS } = require('./adComputers');
const { resolveDirectorate, OU_DB_MAP, DESCRIPTION_DIR_MAP } = require('./directorateMap');

async function getAdComputers() {
  if (process.env.MOCK_AUTH === 'true') return MOCK_COMPUTERS;
  return fetchAdComputers();
}

// Bilgisayar adından cihaz tipini tahmin et
function guessDeviceType(name = '', os = '') {
  const n = name.toUpperCase();
  const o = (os || '').toUpperCase();
  if (n.includes('LAPTOP') || n.includes('NB') || n.includes('DIZUSTU') || o.includes('LAPTOP')) return 'DIZUSTU';
  if (o.includes('SERVER') || n.includes('SRV') || n.includes('SERVER')) return 'SUNUCU';
  return 'BILGISAYAR';
}

/**
 * AD'deki bilgisayarın atandığı kullanıcıyı bul.
 * Sıra:
 *  1. managedByDN'den CN'i al → username olarak dene (çoğu AD'de CN = sAMAccountName)
 *  2. description → username olarak dene (IT "username" yazar buraya)
 *  3. managedBy CN → displayName olarak ara
 */
async function resolveAssignedTo(description, managedBy, managedByDN, prisma) {
  // 1. managedByDN'den CN'i al — bazı AD'lerde CN = sAMAccountName
  if (managedByDN) {
    const cnMatch = String(managedByDN).match(/^CN=([^,]+)/i);
    const cnVal   = cnMatch ? cnMatch[1].trim() : null;
    if (cnVal) {
      const byUsername = await prisma.user.findFirst({
        where: { username: { equals: cnVal, mode: 'insensitive' } },
        select: { username: true },
      });
      if (byUsername) return byUsername.username;
    }
  }

  // 2. description → username
  if (description) {
    const byUsername = await prisma.user.findFirst({
      where: { username: { equals: description.trim(), mode: 'insensitive' } },
      select: { username: true },
    });
    if (byUsername) return byUsername.username;
  }

  // 3. managedBy (display name) → displayName
  if (managedBy) {
    const byDisplay = await prisma.user.findFirst({
      where: { displayName: { equals: managedBy.trim(), mode: 'insensitive' } },
      select: { username: true },
    });
    if (byDisplay) return byDisplay.username;
  }

  return null;
}

// AD cihazlarını çekip DB ile karşılaştır, sadece değişenleri güncelle
async function syncDevicesFromAD(prisma, triggeredBy = 'system') {
  const adComputers = await getAdComputers();

  const dbDevices = await prisma.device.findMany({
    where: { active: true },
  });

  const changes = [];
  const now = new Date();

  for (const adPC of adComputers) {
    // Daire/şube eşleştirmesi
    // 1. AD department alanını dene
    // 2. Null ise OU segmentlerini sağdan sola tara (en özgül → genel)
    let resolveInput = adPC.department || null;
    let directorate  = resolveInput ? resolveDirectorate(resolveInput).directorate : null;
    let department   = resolveInput ? resolveDirectorate(resolveInput).department  : null;

    // Türkçe department metniyle eşleşme yoksa OU slug'larını OU_DB_MAP'te ara
    if (!directorate && adPC.ou) {
      const ouSlugs = adPC.ou.split(' > ').map(s => s.trim().toLowerCase()).filter(Boolean).reverse();
      for (const slug of ouSlugs) {
        if (OU_DB_MAP[slug]) { directorate = OU_DB_MAP[slug]; break; }
      }
    }

    // Hâlâ bulunamadıysa description alanını daire slug olarak dene
    const descSlug = (adPC.description || '').trim().toLowerCase();
    if (!directorate && descSlug && DESCRIPTION_DIR_MAP[descSlug]) {
      directorate = DESCRIPTION_DIR_MAP[descSlug];
    }

    // İsim veya seri numarasına göre DB'de eşleştir
    const dbDevice = dbDevices.find(
      (d) =>
        (d.name && d.name.toLowerCase() === adPC.name?.toLowerCase()) ||
        (d.serialNumber && adPC.serialNumber && d.serialNumber === adPC.serialNumber)
    );

    if (!dbDevice) {
      // Yeni cihaz — envantere ekle
      try {
        const newDevice = await prisma.device.create({
          data: {
            name:         adPC.name,
            type:         guessDeviceType(adPC.name, adPC.os),
            serialNumber: adPC.serialNumber  || null,
            ipAddress:    adPC.dnsName       || null,
            notes:        [adPC.os, adPC.description].filter(Boolean).join(' — ') || null,
            brand:        null,  // AD'den gelmiyor
            model:        adPC.os            || null,
            directorate:  directorate        || null,
            department:   department         || adPC.department || null,
            assignedTo:   null,
            isShared:     true,              // kullanıcı ataması eşleştirme ekranından yapılır
            lastSyncAt:   now,
          },
        });
        changes.push({
          type:       'NEW',
          deviceId:   newDevice.id,
          deviceName: adPC.name,
          detail:     `AD'den yeni cihaz eklendi`,
        });
      } catch (err) {
        console.warn(`[adDeviceSync] Yeni cihaz eklenemedi (${adPC.name}):`, err.message);
      }
      continue;
    }

    // Karşılaştırılacak alanlar — assignedTo AD sync'ten ÇIKARILDI,
    // kullanıcı ataması sadece eşleştirme ekranından yapılır
    const fieldsToCheck = [
      { field: 'name',         adValue: adPC.name         || null },
      { field: 'serialNumber', adValue: adPC.serialNumber  || null },
      { field: 'ipAddress',    adValue: adPC.dnsName       || null },
      { field: 'model',        adValue: adPC.os            || null },
      { field: 'directorate',  adValue: directorate        || null },
      { field: 'department',   adValue: department || adPC.department || null },
    ];

    const deviceChanges = fieldsToCheck
      .filter(({ adValue }) => adValue !== null && adValue !== undefined)
      .filter(({ field, adValue }) => dbDevice[field] !== adValue)
      .map(({ field, adValue }) => ({
        field,
        oldValue: dbDevice[field] ?? null,
        newValue: adValue,
      }));

    if (deviceChanges.length > 0) {
      const updateData = { lastSyncAt: now };
      deviceChanges.forEach((c) => { updateData[c.field] = c.newValue; });

      // assignedTo değiştiyse isShared'i de güncelle
      if (updateData.assignedTo !== undefined) {
        updateData.isShared = !updateData.assignedTo;
      }

      await prisma.device.update({ where: { id: dbDevice.id }, data: updateData });

      await prisma.deviceChangeLog.createMany({
        data: deviceChanges.map((c) => ({
          deviceId:   dbDevice.id,
          field:      c.field,
          oldValue:   String(c.oldValue ?? ''),
          newValue:   String(c.newValue ?? ''),
          changeType: 'AD_SYNC',
          changedBy:  triggeredBy,
        })),
      });

      changes.push({
        type:       'UPDATED',
        deviceId:   dbDevice.id,
        deviceName: dbDevice.name,
        fields:     deviceChanges.map((c) => c.field),
        detail:     deviceChanges
          .map((c) => `${c.field}: "${c.oldValue ?? ''}" → "${c.newValue}"`)
          .join(', '),
      });
    } else {
      await prisma.device.update({ where: { id: dbDevice.id }, data: { lastSyncAt: now } });
    }
  }

  return {
    total:     adComputers.length,
    updated:   changes.filter((c) => c.type === 'UPDATED').length,
    new:       changes.filter((c) => c.type === 'NEW').length,
    unchanged: adComputers.length - changes.length,
    changes,
  };
}

module.exports = { syncDevicesFromAD };
