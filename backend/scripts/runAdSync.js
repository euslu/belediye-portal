'use strict';
require('dotenv').config();
const { runAdSync } = require('../lib/adSync');
const prisma = require('../lib/prisma');

async function main() {
  console.log('=== AD Sync Başlatılıyor ===\n');
  await runAdSync();

  const [total, withDir, withoutDir, top10] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { directorate: { not: null } } }),
    prisma.user.count({ where: { directorate: null } }),
    prisma.user.groupBy({
      by: ['directorate'],
      _count: true,
      where: { directorate: { not: null } },
      orderBy: { _count: { directorate: 'desc' } },
      take: 10,
    }),
  ]);

  console.log('\n=== SONUÇLAR ===');
  console.log('Toplam kullanıcı:', total);
  console.log('Dairesi dolu:', withDir);
  console.log('Dairesi boş:', withoutDir);
  console.log('\nTop 10 daire:');
  top10.forEach((r) => console.log(` [${r._count._all ?? r._count.directorate}]`, r.directorate));

  // Phone/ipPhone coverage
  const [withPhone, withIpPhone, withEmpNo] = await Promise.all([
    prisma.user.count({ where: { phone: { not: null } } }),
    prisma.user.count({ where: { ipPhone: { not: null } } }),
    prisma.user.count({ where: { employeeNumber: { not: null } } }),
  ]);
  console.log('\n=== ATTRIBUTE DOLULUK ===');
  console.log('Phone (GSM):', withPhone);
  console.log('IP Telefon:', withIpPhone);
  console.log('Sicil No:', withEmpNo);

  await prisma.$disconnect();
}
main().catch(console.error);
