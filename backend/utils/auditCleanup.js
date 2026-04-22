'use strict';
const prisma = require('../lib/prisma');
const logger = require('./logger');

async function cleanupOldAuditLogs() {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await prisma.islemGecmisi.deleteMany({
      where: { tarih: { lt: cutoff } },
    });
    if (result.count > 0) {
      logger.info(`[AuditCleanup] ${result.count} eski kayıt silindi (90 gün öncesi)`);
    }
  } catch (err) {
    logger.error('[AuditCleanup] Hata:', err.message);
  }
}

module.exports = { cleanupOldAuditLogs };
