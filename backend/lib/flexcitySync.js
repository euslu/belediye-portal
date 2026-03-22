const prisma = require('./prisma');
const { fetchPersonel, fetchOrgut } = require('../services/flexcity');

async function syncOrgut() {
  console.log('[FlexCity] KBS örgüt sync başlıyor...');
  const orguts = await fetchOrgut();

  let synced = 0;
  for (const o of orguts) {
    await prisma.flexcityOrgut.upsert({
      where: { id: parseInt(o.id) },
      update: {
        adi:       o.adi,
        sabitAdi:  o.sabitAdi || null,
        kod:       o.kod || null,
        durum:     o.durum || null,
        ustId:     o.ustId ? parseInt(o.ustId) : null,
        servisTuru: o.servisTuru || null,
        syncedAt:  new Date(),
      },
      create: {
        id:        parseInt(o.id),
        adi:       o.adi,
        sabitAdi:  o.sabitAdi || null,
        kod:       o.kod || null,
        durum:     o.durum || null,
        ustId:     o.ustId ? parseInt(o.ustId) : null,
        servisTuru: o.servisTuru || null,
      },
    });
    synced++;
  }

  console.log(`[FlexCity] KBS sync: ${synced} örgüt`);
  return { synced };
}

async function syncPersonel() {
  console.log('[FlexCity] SIS personel sync başlıyor...');
  const personelList = await fetchPersonel();

  let updated = 0, notFound = 0;

  for (const p of personelList) {
    const sicilNo = p.KURUM_SICIL_NO ? String(p.KURUM_SICIL_NO).trim() : null;
    const ad      = p.ADI    ? String(p.ADI).trim()    : null;
    const soyad   = p.SOYADI ? String(p.SOYADI).trim() : null;

    if (!sicilNo && (!ad || !soyad)) continue;

    // Önce sicil no ile eşleştir
    let user = null;
    if (sicilNo) {
      user = await prisma.user.findFirst({ where: { employeeNumber: sicilNo } });
    }

    // Bulunamazsa ad-soyad ile ara
    if (!user && ad && soyad) {
      user = await prisma.user.findFirst({
        where: { displayName: { contains: `${ad} ${soyad}`, mode: 'insensitive' } },
      });
    }

    if (!user) { notFound++; continue; }

    const updateData = {};
    if (p.ORGUT_ID != null) updateData.flexcityOrgutId = parseInt(p.ORGUT_ID);
    if (p.PDKS_NO)          updateData.pdksNo           = String(p.PDKS_NO);
    if (p.KADRO)            updateData.kadro             = String(p.KADRO);
    if (p.GOREV)            updateData.gorev             = String(p.GOREV);
    updateData.flexSyncedAt = new Date();

    await prisma.user.update({ where: { id: user.id }, data: updateData });
    updated++;
  }

  console.log(`[FlexCity] Personel sync: ${updated} güncellendi, ${notFound} bulunamadı`);
  return { updated, notFound, total: personelList.length };
}

async function syncAll() {
  const orgResult      = await syncOrgut();
  const personelResult = await syncPersonel();

  await prisma.setting.upsert({
    where:  { key: 'SERVICE_STATUS_FLEXCITY' },
    update: { value: JSON.stringify({ status: 'ok', message: `${personelResult.updated} personel güncellendi`, lastRun: new Date() }) },
    create: { key: 'SERVICE_STATUS_FLEXCITY', value: JSON.stringify({ status: 'ok', message: `${personelResult.updated} personel güncellendi`, lastRun: new Date() }) },
  });

  return { orgResult, personelResult };
}

module.exports = { syncAll, syncOrgut, syncPersonel };
