'use strict';
/**
 * Tüm kullanıcıların department → directorate alanını
 * directorateMap ile normalize eder.
 * Kullanım: node scripts/normalize-departments.js
 */
require('dotenv').config();
const prisma = require('../lib/prisma');
const { resolveDirectorate } = require('../lib/directorateMap');

async function main() {
  const users = await prisma.user.findMany({
    where: { username: { not: 'system' } },
    select: { id: true, username: true, department: true, directorate: true },
  });

  console.log(`${users.length} kullanıcı okundu. Normalize ediliyor...`);

  let updated = 0;
  let skipped = 0;

  for (const u of users) {
    const raw = u.department || u.directorate;
    if (!raw) { skipped++; continue; }

    const { directorate, department } = resolveDirectorate(raw);

    // Zaten doğruysa atla
    if (u.directorate === directorate && u.department === (department || raw)) {
      skipped++;
      continue;
    }

    await prisma.user.update({
      where: { id: u.id },
      data: {
        directorate: directorate || null,
        department:  department  || raw,
      },
    });
    updated++;
  }

  console.log(`Tamamlandı: ${updated} güncellendi, ${skipped} atlandı.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
