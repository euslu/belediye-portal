'use strict';
const prisma = require('../lib/prisma');

async function logIslem({ kullanici, kullaniciAd, islem, modul, kayitId, detay, ip }) {
  try {
    await prisma.islemGecmisi.create({
      data: {
        kullanici:   kullanici   || 'sistem',
        kullaniciAd: kullaniciAd || null,
        islem,
        modul,
        kayitId: kayitId ? String(kayitId) : null,
        detay:   detay   ? JSON.stringify(detay).substring(0, 500) : null,
        ip:      ip      || null,
      },
    });
  } catch (e) {
    console.error('[AuditLog] Hata:', e.message);
  }
}

module.exports = { logIslem };
