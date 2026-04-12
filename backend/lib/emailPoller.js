/**
 * emailPoller.js — IMAP kutusunu tarayarak yeni e-postalardan otomatik ticket oluşturur.
 *
 * ENV değişkenleri:
 *   IMAP_ENABLED=true      Aktif etmek için
 *   IMAP_HOST              IMAP sunucu adresi
 *   IMAP_PORT              IMAP port (varsayılan 993)
 *   IMAP_USER              IMAP kullanıcı adı (e-posta adresi)
 *   IMAP_PASS              IMAP parolası
 *   IMAP_TLS               false ise TLS devre dışı (varsayılan true)
 *   IMAP_MAILBOX           İzlenecek klasör (varsayılan INBOX)
 *   IMAP_DEFAULT_CATEGORY  Otomatik ticket için categoryId (opsiyonel)
 */

const { ImapFlow } = require('imapflow');
const prisma = require('./prisma');
const { getTlsOptions } = require('../utils/tls');

const ENABLED        = process.env.IMAP_ENABLED === 'true';
const IMAP_HOST      = process.env.IMAP_HOST;
const IMAP_PORT      = parseInt(process.env.IMAP_PORT) || 993;
const IMAP_USER      = process.env.IMAP_USER;
const IMAP_PASS      = process.env.IMAP_PASS;
const IMAP_TLS       = process.env.IMAP_TLS !== 'false';
const IMAP_MAILBOX   = process.env.IMAP_MAILBOX || 'INBOX';
const DEFAULT_CAT_ID = process.env.IMAP_DEFAULT_CATEGORY ? parseInt(process.env.IMAP_DEFAULT_CATEGORY) : null;

// SYSTEM_USER_ID: e-posta ile gelen ticket'lar için sahte kullanıcı (id=1 admin)
const SYSTEM_CREATOR_ID = 1;

/**
 * E-posta metnini temizle (HTML → düz metin)
 */
function stripHtml(str) {
  if (!str) return '';
  return str
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Gönderen e-posta adresine göre DB'den kullanıcı bul
 */
async function findUserByEmail(fromAddress) {
  if (!fromAddress) return null;
  try {
    return await prisma.user.findFirst({ where: { email: fromAddress } });
  } catch {
    return null;
  }
}

/**
 * IMAP kutusunu tara, okunamayan e-postaları işle
 */
async function pollEmails() {
  if (!ENABLED) {
    console.log('[EmailPoller] Devre dışı (IMAP_ENABLED=true gerekli)');
    return { processed: 0, skipped: 0 };
  }

  if (!IMAP_HOST || !IMAP_USER || !IMAP_PASS) {
    console.warn('[EmailPoller] IMAP yapılandırması eksik — atlanıyor');
    return { processed: 0, skipped: 0 };
  }

  const client = new ImapFlow({
    host:   IMAP_HOST,
    port:   IMAP_PORT,
    secure: IMAP_TLS,
    auth:   { user: IMAP_USER, pass: IMAP_PASS },
    logger: false,
    tls:    getTlsOptions('IMAP', IMAP_HOST),
  });

  let processed = 0;
  let skipped   = 0;

  try {
    await client.connect();
    const mailbox = await client.mailboxOpen(IMAP_MAILBOX);

    if (mailbox.exists === 0) {
      await client.logout();
      return { processed: 0, skipped: 0 };
    }

    // Sadece okunmamış e-postaları getir
    const messages = await client.search({ seen: false });

    for (const uid of messages) {
      try {
        const msg = await client.fetchOne(uid, { source: true, envelope: true });
        if (!msg) { skipped++; continue; }

        const envelope = msg.envelope;
        const from     = envelope?.from?.[0];
        const fromAddr = from?.address || '';
        const fromName = from?.name   || fromAddr;
        const subject  = envelope?.subject || '(Konu belirtilmemiş)';

        // Mesaj gövdesini al (source buffer → string)
        let body = '';
        if (msg.source) {
          const raw = msg.source.toString('utf8');
          // Basit header/body ayrımı (çift CRLF)
          const bodyStart = raw.indexOf('\r\n\r\n');
          body = bodyStart > -1 ? raw.slice(bodyStart + 4) : raw;
          body = stripHtml(body).slice(0, 2000);
        }

        // Başlığı temizle (RE:, FW: öneklerini kaldır)
        const cleanSubject = subject
          .replace(/^(re|fw|fwd):\s*/gi, '')
          .trim()
          .slice(0, 200);

        // Oluşturan kullanıcıyı bul (e-posta eşleşmesi)
        const matchedUser = await findUserByEmail(fromAddr);
        const creatorId   = matchedUser?.id || SYSTEM_CREATOR_ID;

        // Ticket zaten var mı? (aynı konu+gönderen için son 24 saatte duplicate önleme)
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existing = await prisma.ticket.findFirst({
          where: {
            title:       cleanSubject,
            source:      'EMAIL',
            createdById: creatorId,
            createdAt:   { gte: since24h },
          },
        });

        if (existing) {
          skipped++;
          // E-postayı okundu olarak işaretle
          await client.messageFlagsAdd(uid, ['\\Seen']);
          continue;
        }

        // Ticket oluştur
        const description = [
          `**Gönderen:** ${fromName} <${fromAddr}>`,
          body || '(İçerik yok)',
        ].join('\n\n');

        await prisma.ticket.create({
          data: {
            title:       cleanSubject,
            description,
            source:      'EMAIL',
            type:        'REQUEST',
            status:      'OPEN',
            priority:    'MEDIUM',
            createdById: creatorId,
            ...(DEFAULT_CAT_ID ? { categoryId: DEFAULT_CAT_ID } : {}),
          },
        });

        // E-postayı okundu olarak işaretle
        await client.messageFlagsAdd(uid, ['\\Seen']);
        processed++;
        console.log(`[EmailPoller] Ticket oluşturuldu: "${cleanSubject}" ← ${fromAddr}`);
      } catch (msgErr) {
        console.error(`[EmailPoller] Mesaj işlenemedi (uid=${uid}):`, msgErr.message);
        skipped++;
      }
    }

    await client.logout();
  } catch (err) {
    console.error('[EmailPoller] IMAP bağlantı hatası:', err.message);
  }

  console.log(`[EmailPoller] Tamamlandı: ${processed} işlendi, ${skipped} atlandı`);
  return { processed, skipped };
}

module.exports = { pollEmails };
