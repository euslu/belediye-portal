/**
 * AD title alanında "Müdür" geçen kullanıcıları UserRole tablosuna mudur olarak ekler.
 * Mevcut kaydı olanlar (admin, daire_baskani vb.) atlanır.
 * Kullanım: node scripts/seedMudur.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const prisma = require('../lib/prisma');

async function seed() {
  const users = await prisma.user.findMany({
    where: { title: { contains: 'Müdür', mode: 'insensitive' } },
    select: { username: true, displayName: true, title: true, directorate: true, department: true },
    orderBy: [{ directorate: 'asc' }, { department: 'asc' }],
  });

  console.log(`${users.length} müdür/müdür vekili bulundu.\n`);

  let added = 0;
  let skipped = 0;

  for (const u of users) {
    const existing = await prisma.userRole.findUnique({ where: { username: u.username } });
    if (existing) {
      console.log(`  MEVCUT  ${u.username.padEnd(26)} | ${existing.role} (atlandı)`);
      skipped++;
      continue;
    }
    await prisma.userRole.create({
      data: {
        username: u.username,
        displayName: u.displayName,
        role: 'mudur',
        directorate: u.directorate,
        department: u.department,
        active: true,
        updatedBy: 'seed-mudur',
      },
    });
    console.log(`  EKLENDİ ${u.username.padEnd(26)} | mudur | ${u.department || ''}`);
    added++;
  }

  console.log(`\n${added} eklendi, ${skipped} mevcut kaydı olduğu için atlandı.`);

  // Özet
  const counts = await prisma.userRole.groupBy({ by: ['role'], _count: true, where: { active: true } });
  console.log('\n--- Rol dağılımı ---');
  counts.forEach(c => console.log(`  ${c.role.padEnd(16)} : ${c._count}`));
}

seed()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
