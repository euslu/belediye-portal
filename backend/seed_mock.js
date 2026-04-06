require('dotenv').config();
const prisma = require('./lib/prisma');
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('test123', 10);

const users = [
  { username: 'test.daire.baskani', displayName: 'Test Daire Başkanı', email: 'test.db@mugla.bel.tr', directorate: 'Bilgi İşlem Dairesi Başkanlığı', department: 'Bilgi İşlem Dairesi Başkanlığı', title: 'Bilgi İşlem Dairesi Başkanı', role: 'manager' },
  { username: 'test.mudur',         displayName: 'Test Müdür',         email: 'test.mudur@mugla.bel.tr', directorate: 'Bilgi İşlem Dairesi Başkanlığı', department: 'Sistem Yönetimi Şube Müdürlüğü', title: 'Sistem Yönetimi Şube Müdürü', role: 'manager' },
  { username: 'test.personel',      displayName: 'Test Personel',      email: 'test.personel@mugla.bel.tr', directorate: 'Bilgi İşlem Dairesi Başkanlığı', department: 'Sistem Yönetimi Şube Müdürlüğü', title: 'Tekniker', role: 'user' },
  { username: 'test.baska.daire',   displayName: 'Test Başka Daire',   email: 'test.bd@mugla.bel.tr', directorate: 'Fen İşleri Dairesi Başkanlığı', department: 'Yol Yapım Şube Müdürlüğü', title: 'Mühendis', role: 'user' },
];

const roller = [
  { username: 'test.daire.baskani', role: 'daire_baskani', directorate: 'Bilgi İşlem Dairesi Başkanlığı' },
  { username: 'test.mudur',         role: 'mudur',         directorate: 'Bilgi İşlem Dairesi Başkanlığı', department: 'Sistem Yönetimi Şube Müdürlüğü' },
  { username: 'test.personel',      role: 'personel',      directorate: 'Bilgi İşlem Dairesi Başkanlığı' },
  { username: 'test.baska.daire',   role: 'personel',      directorate: 'Fen İşleri Dairesi Başkanlığı' },
];

async function main() {
  // Kullanıcıları oluştur
  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      create: { ...u, password: hash },
      update: { ...u, password: hash },
    });
    console.log('User OK:', u.username);
  }

  // Rolleri ata
  for (const r of roller) {
    await prisma.userRole.upsert({
      where: { username: r.username },
      create: { ...r, active: true, displayName: r.username, updatedBy: 'seed' },
      update: { role: r.role, active: true },
    });
    console.log('Role OK:', r.username, '->', r.role);
  }

  await prisma.$disconnect();
  console.log('\nTamamlandı.');
}

main().catch(e => { console.error(e.message); prisma.$disconnect(); });
