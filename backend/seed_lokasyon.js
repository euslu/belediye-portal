require('dotenv').config();
const prisma = require('./lib/prisma');

// İlçe tespiti — önce uzun adları, sonra kısa adları kontrol et
const ILCELER = [
  'Seydikemer', 'Kavaklıdere', 'Kavaklidere',
  'Köyceğiz', 'Fethiye', 'Marmaris', 'Dalaman',
  'Bodrum', 'Yatağan', 'Ortaca', 'Datça', 'Milas',
  'Menteşe', 'Ula',
];

function ilceBul(ad) {
  for (const ilce of ILCELER) {
    if (ad.toLowerCase().includes(ilce.toLowerCase())) return ilce;
  }
  return 'Menteşe'; // varsayılan merkez
}

// Bina tipini tahmin et
function tipBul(ad) {
  const a = ad.toLowerCase();
  if (a.includes('itfaiye')) return 'istasyon';
  if (a.includes('şantiye') || a.includes('santiye') || a.includes('hafriyat') || a.includes('depolama') || a.includes('atık')) return 'saha';
  if (a.includes('otogar') || a.includes('terminal') || a.includes('liman') || a.includes('otopark')) return 'tesis';
  if (a.includes('dairesi başkanlığı') || a.includes('müdürlüğü') || a.includes('amirliği') || a.includes('şefliği')) return 'mudurluk';
  return 'hizmet_binasi';
}

async function main() {
  const rows = await prisma.user.groupBy({
    by: ['city'],
    _count: { city: true },
    orderBy: { _count: { city: 'desc' } },
  });

  let eklenen = 0, atlanan = 0;

  for (const row of rows) {
    const ad = row.city;
    if (!ad || ad === '-' || ad.trim() === '') { atlanan++; continue; }

    const ilce = ilceBul(ad);
    const tip  = tipBul(ad);

    await prisma.lokasyon.upsert({
      where:  { ad },
      create: { ad, ilce, tip, personelSayisi: row._count.city, aktif: true },
      update: { personelSayisi: row._count.city },
    });
    console.log(`[${eklenen + 1}] ${ad} → ${ilce} (${tip}) — ${row._count.city} kişi`);
    eklenen++;
  }

  console.log(`\nTamamlandı: ${eklenen} lokasyon eklendi, ${atlanan} atlandı.`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e.message); prisma.$disconnect(); });
