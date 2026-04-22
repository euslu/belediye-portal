/**
 * AD title alanından "Daire Başkan" içeren kullanıcıları UserRole tablosuna daire_baskani olarak ekler.
 * Kullanım: node scripts/seedDaireBaskan.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const prisma = require('../lib/prisma');

// Daire başkanı olmayanlar (Belediye Başkanı, Teftiş Kurulu vb.)
const HARIC = ['ahmet.aras'];

async function seed() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { title: { contains: 'Daire Başkan', mode: 'insensitive' } },
        { title: { contains: 'Dairesi Başkan', mode: 'insensitive' } },
      ],
    },
    select: { username: true, displayName: true, title: true, directorate: true, department: true },
  });

  // "Daire Başkan" içeren ama hariç listede olmayanlar
  const candidates = users.filter(u => !HARIC.includes(u.username));

  console.log(`${candidates.length} daire başkanı bulundu, UserRole tablosuna ekleniyor...\n`);

  for (const u of candidates) {
    const existing = await prisma.userRole.findUnique({ where: { username: u.username } });
    if (existing) {
      console.log(`  MEVCUT  ${u.username.padEnd(26)} | ${existing.role} (değiştirilmedi)`);
      continue;
    }
    await prisma.userRole.create({
      data: {
        username: u.username,
        displayName: u.displayName,
        role: 'daire_baskani',
        directorate: u.directorate,
        department: u.department,
        active: true,
        updatedBy: 'seed-daire-baskan',
      },
    });
    console.log(`  EKLENDİ ${u.username.padEnd(26)} | daire_baskani | ${u.directorate || ''}`);
  }

  // Doğrulama
  const all = await prisma.userRole.findMany({ where: { active: true }, orderBy: { role: 'asc' } });
  console.log(`\n--- Aktif UserRole kayıtları (${all.length}) ---`);
  all.forEach(r => console.log(`  ${r.role.padEnd(16)} | ${r.username.padEnd(26)} | ${r.displayName}`));
}

seed()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
