const logger = require('../utils/logger');

function normalize(gsm) {
  if (!gsm) return null;
  const digits = String(gsm).replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('5')) return '90' + digits;
  if (digits.length === 11 && digits.startsWith('05')) return '9' + digits.slice(1);
  if (digits.length === 12 && digits.startsWith('90')) return digits;
  return null;
}

async function smsSend(recipients, message) {
  const nums = (Array.isArray(recipients) ? recipients : [recipients])
    .map(normalize)
    .filter(Boolean);

  if (!nums.length) return { basarili: 0, basarisiz: 0, toplam: 0, hata: 'Geçerli numara yok' };

  logger.info(`[SMS-STUB] Gönderim isteği: ${nums.length} alıcı`, {
    ornek: nums.slice(0, 3),
    mesajUzunluk: message?.length || 0,
  });

  return { basarili: nums.length, basarisiz: 0, toplam: nums.length, stub: true };
}

module.exports = { smsSend, normalize };
