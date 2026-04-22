'use strict';

/**
 * ulakBELL Vatandaş Başvurusu Polling Servisi
 * Her N dakikada bir yeni başvuruları çeker ve portal bildirimi oluşturur.
 */

const prisma = require('../lib/prisma');
const ub     = require('./ulakbell');
const logger = require('../utils/logger');
const smsNotif = require('./smsNotification');

const POLL_INTERVAL = parseInt(process.env.ULAKBELL_POLL_DAKIKA || '5') * 60 * 1000;

async function pollYeniBasvurular() {
  try {
    const cfg = await ub.getConfig();
    if (!cfg.base || !cfg.token) return; // yapılandırılmamışsa sessiz çık

    // Son 50 "new" statüsündeki başvuruyu çek
    const data = await ub.getIncidents({
      page: 1,
      count: 50,
      status: ['new'],
    });

    const basvurular = data.data || data || [];
    let eklenen = 0;

    for (const b of basvurular) {
      const basvuruNo = parseInt(b.number);
      if (!basvuruNo) continue;

      // Zaten kaydedilmiş mi?
      const varMi = await prisma.ulakbellBildirim.findFirst({
        where: { basvuruNo },
      });
      if (varMi) continue;

      // Kurum içi başvuruları atla
      const kaynakAdi = String(b.source_title || '').toLowerCase();
      if (kaynakAdi.includes('kurum içi') || kaynakAdi.includes('kurum ici')) {
        continue;
      }

      // Konu eşleştirmesini bul
      const topicId = b.topic_id ? parseInt(b.topic_id) : 0;
      const eslestirme = topicId
        ? await prisma.ulakbellKonuEslestirme.findUnique({
            where: { ulakbellKonuId: topicId },
          })
        : null;

      const yeniBildirim = await prisma.ulakbellBildirim.create({
        data: {
          konuId:         topicId,
          basvuruNo,
          publicToken:    b.public_token || '',
          basvuruTipi:    b.incident_type || null,
          basvuranAd:     [b.name, b.last_name].filter(Boolean).join(' ') || null,
          ilce:           b.district_title || null,
          mahalle:        b.neighborhood_title || null,
          portalDaire:    eslestirme?.portalDaire || null,
          portalMudurluk: eslestirme?.portalMudurluk || null,
          durum:          'YENI',
          okundu:         false,
        },
      });
      // SMS: daire başkanına yeni başvuru bildirimi
      if (yeniBildirim.portalDaire) {
        smsNotif.smsUlakbellYeniBasvuru(yeniBildirim).catch(() => {});
      }
      eklenen++;
    }

    if (eklenen > 0) {
      logger.info(`[ulakBELL Poller] ${eklenen} yeni bildirim oluşturuldu (${basvurular.length} kontrol edildi)`);
    }
  } catch (e) {
    logger.error(`[ulakBELL Poller] Hata: ${e.message}`);
  }
}

function startPoller() {
  // Token yoksa başlatma
  ub.getConfig().then(cfg => {
    if (!cfg.base || !cfg.token) {
      logger.info('[ulakBELL Poller] Token yok, polling baslatilmadi');
      return;
    }

    logger.info(`[ulakBELL Poller] ${POLL_INTERVAL / 60000} dakikada bir calisacak`);

    // İlk çalışma — 30 saniye sonra
    setTimeout(pollYeniBasvurular, 30000);

    // Periyodik çalışma
    setInterval(pollYeniBasvurular, POLL_INTERVAL);
  }).catch(() => {});
}

module.exports = { startPoller, pollYeniBasvurular };
