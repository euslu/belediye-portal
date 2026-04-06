require('dotenv').config();
const XLSX = require('xlsx');
const prisma = require('../lib/prisma');

function hatTipiFromPaket(paket) {
  if (!paket) return 'm2m_data';
  const p = paket.toLowerCase();
  if (p.includes('ses data')) return 'ses_data';
  if (p.includes('m2m')) return 'm2m';
  if (p.includes('asansör') || p.includes('asansor')) return 'asansor';
  if (p.includes('ses')) return 'ses';
  return 'm2m_data';
}

function toStr(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

async function importHatlar() {
  const wb = XLSX.readFile('/Users/ethem/Downloads/2026-2027 GSM LİSTESİ 1.xlsx');
  const ws = wb.Sheets['Sayfa1'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1); // skip header

  console.log(`HatAtamasi: ${rows.length} satır okundu`);

  // Önce temizle
  const deleted = await prisma.hatAtamasi.deleteMany({});
  console.log(`  ${deleted.count} eski kayıt silindi`);

  let ok = 0, skip = 0;
  for (const r of rows) {
    const hatNo = toStr(r[2]);
    if (!hatNo) { skip++; continue; }

    await prisma.hatAtamasi.create({
      data: {
        hatNo,
        directorate:    toStr(r[1]),
        iccid:          toStr(r[3]),
        hatTipi:        hatTipiFromPaket(toStr(r[4])),
        paket:          toStr(r[4]),
        displayName:    toStr(r[5]),
        cihaz:          toStr(r[6]),
        network:        toStr(r[7]),
        ip:             toStr(r[8]),
        notlar:         toStr(r[9]),
        aktif:          true,
      }
    });
    ok++;
  }
  console.log(`  ${ok} kayıt eklendi, ${skip} satır atlandı`);
}

async function importCihazlar() {
  const wb = XLSX.readFile('/Users/ethem/Downloads/GSM_ENVANTER(2026-2027).xlsx');
  const ws = wb.Sheets['Sayfa1'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1);

  console.log(`CihazEnvanter: ${rows.length} satır okundu`);

  const deleted = await prisma.cihazEnvanter.deleteMany({});
  console.log(`  ${deleted.count} eski kayıt silindi`);

  let ok = 0, skip = 0;
  for (const r of rows) {
    const daire = toStr(r[0]);
    if (!daire) { skip++; continue; }

    await prisma.cihazEnvanter.create({
      data: {
        daireBaskanlik: daire,
        kullanici:      toStr(r[1]),
        cihazMarka:     toStr(r[2]),
        cihazModel:     toStr(r[3]),
        cihazSeriNo:    toStr(r[4]),
        cihazTuru:      toStr(r[5]),
        cihazImei:      toStr(r[6]),
        gsmHatSeriNo:   toStr(r[7]),
        gsmHatTelNo:    toStr(r[8]),
        paketTuru:      toStr(r[9]),
        paketGb:        toStr(r[10]),
        aktif:          true,
      }
    });
    ok++;
  }
  console.log(`  ${ok} kayıt eklendi, ${skip} satır atlandı`);
}

async function main() {
  try {
    await importHatlar();
    await importCihazlar();
    console.log('\nTamamlandı.');
  } catch (e) {
    console.error('HATA:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
