/**
 * Yanlış admin rollerini düzeltir.
 * - User tablosundaki tüm admin'leri 'user' rolüne düşürür (portal.admin hariç)
 * - burak.mazbasi ve portal.admin'i UserRole tablosuna admin olarak ekler
 *
 * Kullanım: node scripts/fixAdminRoles.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const prisma = require('../lib/prisma');

async function fix() {
  // 1. Yanlış admin rolleri düşür
  const result = await prisma.user.updateMany({
    where: {
      role: 'admin',
      username: { notIn: ['portal.admin'] },
    },
    data: { role: 'user' },
  });
  console.log(`${result.count} kullanıcı admin'den user'a düşürüldü`);

  // 2. burak.mazbasi ve portal.admin için UserRole kaydı
  const adminUsers = ['burak.mazbasi', 'portal.admin'];
  for (const username of adminUsers) {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { displayName: true, directorate: true, department: true },
    });
    if (!user) {
      console.log(`${username} — User tablosunda bulunamadı, atlanıyor`);
      continue;
    }
    await prisma.userRole.upsert({
      where: { username },
      update: { role: 'admin', active: true, updatedBy: 'system-fix' },
      create: {
        username,
        displayName: user.displayName,
        role: 'admin',
        directorate: user.directorate,
        department: user.department,
        active: true,
        updatedBy: 'system-fix',
      },
    });
    console.log(`${username} → UserRole admin eklendi/güncellendi`);
  }

  // 3. Doğrulama
  const admins = await prisma.userRole.findMany({ where: { role: 'admin', active: true } });
  console.log('\nAktif admin UserRole kayıtları:');
  admins.forEach(r => console.log(`  ${r.username} | ${r.displayName}`));
}

fix()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
