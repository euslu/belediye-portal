// ─── AD Cihaz Senkronizasyonu ─────────────────────────────────────────────────
const { fetchAdComputers, MOCK_COMPUTERS } = require('./adComputers');

// Mock mod aktifse gerçek LDAP çağrısı yapmadan mock veriyi kullan
async function getAdComputers() {
  if (process.env.MOCK_AUTH === 'true') return MOCK_COMPUTERS;
  return fetchAdComputers();
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
    // İsim veya seri numarasına göre eşleştir
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
            name:        adPC.name,
            type:        'BILGISAYAR',
            ipAddress:   adPC.ipAddress || null,
            notes:       adPC.os        || null,
            lastSyncAt:  now,
          },
        });
        changes.push({
          type:       'NEW',
          deviceId:   newDevice.id,
          deviceName: adPC.name,
          detail:     "AD'den yeni cihaz eklendi",
        });
      } catch (err) {
        // Duplicate name gibi hatalar sessizce atla
        console.warn(`[adDeviceSync] Yeni cihaz eklenemedi (${adPC.name}):`, err.message);
      }
      continue;
    }

    // Karşılaştırılacak alanlar: [ DB alanı, AD değeri ]
    const fieldsToCheck = [
      { field: 'name',      adValue: adPC.name      || null },
      { field: 'ipAddress', adValue: adPC.ipAddress  || null },
      { field: 'notes',     adValue: adPC.os         || null },
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

      await prisma.device.update({
        where: { id: dbDevice.id },
        data:  updateData,
      });

      await prisma.deviceChangeLog.createMany({
        data: deviceChanges.map((c) => ({
          deviceId:   dbDevice.id,
          field:      c.field,
          oldValue:   c.oldValue,
          newValue:   c.newValue,
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
      // Değişiklik yok ama lastSyncAt güncelle
      await prisma.device.update({
        where: { id: dbDevice.id },
        data:  { lastSyncAt: now },
      });
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
