/**
 * SLA Kontrol Servisi
 * Her 30 dakikada bir SLA süresi dolmuş ticket'ları kontrol eder.
 * SLA süresi: Subject.slaHours || Category.slaHours
 * Deadline: ticket.createdAt + slaHours
 * Aşılmışsa SMS gönderir (personel + müdür + daire başkanı)
 */
const prisma = require('../lib/prisma');
const { smsSlaAsildi } = require('./smsNotification');
const logger = require('../utils/logger');

// Aynı ticket için aynı dönemde tekrar SMS gönderme
const smsGonderildi = new Set();

async function checkSla() {
  try {
    const simdi = new Date();

    // Açık/atanmış ticket'lar (kapalı/çözülmüş/reddedilmiş hariç)
    const tickets = await prisma.ticket.findMany({
      where: {
        status: { notIn: ['CLOSED', 'RESOLVED', 'REJECTED'] },
        OR: [
          { subject: { slaHours: { not: null } } },
          { category: { slaHours: { not: null } } },
        ],
      },
      include: {
        subject:    { select: { slaHours: true } },
        category:   { select: { slaHours: true } },
        assignedTo: { select: { id: true, username: true, phone: true, department: true, directorate: true } },
      },
    });

    let smsSayisi = 0;

    for (const ticket of tickets) {
      const slaHours = ticket.subject?.slaHours || ticket.category?.slaHours;
      if (!slaHours) continue;

      const deadline = new Date(ticket.createdAt.getTime() + slaHours * 60 * 60 * 1000);
      if (simdi < deadline) continue; // henüz aşılmamış

      // Daha önce bu periyotta SMS gönderildiyse atla (30dk periyotlarla)
      const period = Math.floor(simdi.getTime() / (30 * 60 * 1000));
      const cacheKey = `${ticket.id}_${period}`;
      if (smsGonderildi.has(cacheKey)) continue;

      await smsSlaAsildi({
        id:             ticket.id,
        title:          ticket.title,
        assignedToId:   ticket.assignedToId,
        assignedTo:     ticket.assignedTo,
        targetDept:     ticket.assignedTo?.department,
        targetDirectorate: ticket.assignedTo?.directorate,
      });

      smsGonderildi.add(cacheKey);
      smsSayisi++;

      // Cache temizliği — çok büyümesini engelle
      if (smsGonderildi.size > 5000) {
        smsGonderildi.clear();
      }
    }

    if (smsSayisi > 0) {
      logger.info(`[SLA Checker] ${tickets.length} ticket kontrol edildi, ${smsSayisi} SLA asimi SMS gonderildi`);
    }
  } catch (e) {
    logger.error(`[SLA Checker] Hata: ${e.message}`);
  }
}

function startSlaChecker() {
  // İlk çalışma — 2 dakika sonra
  setTimeout(checkSla, 2 * 60 * 1000);

  // Her 30 dakikada bir
  setInterval(checkSla, 30 * 60 * 1000);

  logger.info('[SLA Checker] Baslatildi — 30 dakikada bir calisacak');
}

module.exports = { startSlaChecker, checkSla };
