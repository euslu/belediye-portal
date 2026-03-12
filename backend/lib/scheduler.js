const cron = require('node-cron');
const { runAdSync }  = require('./adSync');
const { pollEmails } = require('./emailPoller');

// Her gün sabah 08:00'de AD senkronizasyonu yap
cron.schedule('0 8,20 * * *', async () => {
  console.log('[Scheduler] AD senkronizasyonu başlatılıyor...');
  try {
    const changes = await runAdSync();
    console.log(`[Scheduler] AD senkronizasyonu tamamlandı — ${changes.length} değişiklik`);
  } catch (err) {
    console.error('[Scheduler] AD senkronizasyonu başarısız:', err.message);
  }
}, { timezone: 'Europe/Istanbul' });

// Her 5 dakikada bir IMAP kutusunu tara (IMAP_ENABLED=true ise aktif)
cron.schedule('*/5 * * * *', async () => {
  if (process.env.IMAP_ENABLED !== 'true') return;
  try {
    await pollEmails();
  } catch (err) {
    console.error('[Scheduler] E-posta tarama başarısız:', err.message);
  }
}, { timezone: 'Europe/Istanbul' });

console.log('[Scheduler] AD sync zamanlandı: her gün 08:00 ve 20:00 (Istanbul)');
console.log('[Scheduler] E-posta tarama zamanlandı: her 5 dakika');
