const cron = require('node-cron');
const { runAdSync }        = require('./adSync');
const { pollEmails }       = require('./emailPoller');
const { sendBirthdayMails } = require('./birthdayMailer');
const { sendWelcomeMails }  = require('./welcomeMailer');

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

// Her gece 02:00'de EPC senkronizasyonu
cron.schedule('0 2 * * *', async () => {
  console.log('[Scheduler] EPC senkronizasyonu başlatılıyor...');
  try {
    const { syncToInventory } = require('../services/servicedesk');
    const result = await syncToInventory();
    console.log(`[Scheduler] EPC senkronizasyonu tamamlandı — ${result.created} eklendi, ${result.updated} güncellendi`);
  } catch (err) {
    console.error('[Scheduler] EPC senkronizasyonu başarısız:', err.message);
  }
}, { timezone: 'Europe/Istanbul' });

// Her gün 09:00'da doğum günü maili gönder
cron.schedule('0 9 * * *', async () => {
  console.log('[Scheduler] Doğum günü mailleri gönderiliyor...');
  try {
    const result = await sendBirthdayMails();
    console.log(`[Scheduler] Doğum günü maili — ${result.sent} gönderildi, ${result.failed} hata`);
  } catch (err) {
    console.error('[Scheduler] Doğum günü maili başarısız:', err.message);
  }
}, { timezone: 'Europe/Istanbul' });

// Her gün 09:05'de hoş geldiniz maili gönder
cron.schedule('5 9 * * *', async () => {
  console.log('[Scheduler] Hoş geldiniz mailleri gönderiliyor...');
  try {
    const result = await sendWelcomeMails();
    console.log(`[Scheduler] Hoş geldiniz maili — ${result.sent} gönderildi, ${result.failed} hata`);
  } catch (err) {
    console.error('[Scheduler] Hoş geldiniz maili başarısız:', err.message);
  }
}, { timezone: 'Europe/Istanbul' });

console.log('[Scheduler] AD sync zamanlandı: her gün 08:00 ve 20:00 (Istanbul)');
console.log('[Scheduler] EPC sync zamanlandı: her gece 02:00 (Istanbul)');
console.log('[Scheduler] E-posta tarama zamanlandı: her 5 dakika');
console.log('[Scheduler] Doğum günü maili zamanlandı: her gün 09:00 (Istanbul)');
console.log('[Scheduler] Hoş geldiniz maili zamanlandı: her gün 09:05 (Istanbul)');
