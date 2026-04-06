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

// Her gün 06:00 ve 14:00'de FlexCity personel cache yenile
cron.schedule('0 6,14 * * *', async () => {
  console.log('[Scheduler] FlexCity BSK_PERSONEL_BILGI cache yenileniyor...');
  try {
    const { refreshPersonelCache } = require('../services/flexcity');
    await refreshPersonelCache();
    console.log('[Scheduler] FlexCity personel cache güncellendi');
  } catch (err) {
    console.error('[Scheduler] FlexCity personel cache hatası:', err.message);
  }
}, { timezone: 'Europe/Istanbul' });

// Her gece 03:00'de FlexCity sync
cron.schedule('0 3 * * *', async () => {
  console.log('[Scheduler] FlexCity sync başlıyor...');
  try {
    const { syncAll } = require('./flexcitySync');
    const result = await syncAll();
    console.log(`[Scheduler] FlexCity sync tamamlandı — ${result.personelResult.updated} personel, ${result.orgResult.synced} örgüt`);
  } catch (err) {
    console.error('[Scheduler] FlexCity sync başarısız:', err.message);
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
console.log('[Scheduler] FlexCity personel cache zamanlandı: her gün 06:00 ve 14:00 (Istanbul)');
console.log('[Scheduler] FlexCity sync zamanlandı: her gece 03:00 (Istanbul)');
