const { sendMail } = require('./mailer');

const APP_URL     = process.env.APP_URL            || 'http://localhost:5173';
const ADMIN_EMAIL = process.env.NOTIFY_ADMIN_EMAIL || 'bilgislem@mugla.bel.tr';

// Grup adından çevre değişkenine mail adresini bul:
// "Ağ ve Altyapı" → GROUP_MAIL_AG, "Donanım Destek" → GROUP_MAIL_DONANIM ...
const GROUP_MAIL_MAP = {
  'Ağ ve Altyapı':      process.env.GROUP_MAIL_AG,
  'Donanım Destek':     process.env.GROUP_MAIL_DONANIM,
  'Yazılım Geliştirme': process.env.GROUP_MAIL_YAZILIM,
  'Güvenlik':           process.env.GROUP_MAIL_GUVENLIK,
  'Sunucu ve Sistem':   process.env.GROUP_MAIL_SUNUCU,
  'Kullanıcı Destek':   process.env.GROUP_MAIL_KULLANICI,
};

function getGroupEmail(groupName) {
  return GROUP_MAIL_MAP[groupName] || null;
}

const PRIORITY_TR = { LOW: 'Düşük', MEDIUM: 'Orta', HIGH: 'Yüksek', CRITICAL: 'Kritik' };
const STATUS_TR   = { OPEN: 'Açık', ASSIGNED: 'Atandı', IN_PROGRESS: 'İşlemde', RESOLVED: 'Çözüldü', CLOSED: 'Kapalı' };

// ─── HTML şablonu ─────────────────────────────────────────────────────────────
function template({ title, body }) {
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <!-- Başlık -->
        <tr>
          <td style="background:#1d4ed8;padding:24px 32px">
            <p style="margin:0;color:#fff;font-size:13px;opacity:.8">Muğla Büyükşehir Belediyesi</p>
            <p style="margin:4px 0 0;color:#fff;font-size:20px;font-weight:bold">Kurumsal Uygulama Portalı</p>
          </td>
        </tr>
        <!-- İçerik -->
        <tr>
          <td style="padding:32px">
            <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px">${title}</h2>
            ${body}
          </td>
        </tr>
        <!-- İmza -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0">
            <p style="margin:0;color:#64748b;font-size:12px">
              Bu e-posta <strong>Muğla Büyükşehir Belediyesi Bilgi İşlem Dairesi Başkanlığı</strong>
              tarafından otomatik olarak gönderilmiştir.<br>
              Yanıtlamayınız.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Ticket bilgi kutusu ──────────────────────────────────────────────────────
function ticketBox(ticket) {
  const link = `${APP_URL}/itsm/${ticket.id}`;
  return `
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#f1f5f9;border-radius:6px;padding:16px;margin-bottom:20px">
    <tr>
      <td style="padding:4px 0">
        <span style="color:#64748b;font-size:13px">Talep No</span><br>
        <strong style="color:#1e293b">#${ticket.id}</strong>
      </td>
      <td style="padding:4px 0">
        <span style="color:#64748b;font-size:13px">Öncelik</span><br>
        <strong style="color:#1e293b">${PRIORITY_TR[ticket.priority] || ticket.priority}</strong>
      </td>
      <td style="padding:4px 0">
        <span style="color:#64748b;font-size:13px">Durum</span><br>
        <strong style="color:#1e293b">${STATUS_TR[ticket.status] || ticket.status}</strong>
      </td>
    </tr>
    <tr>
      <td colspan="3" style="padding:12px 0 4px">
        <span style="color:#64748b;font-size:13px">Konu</span><br>
        <strong style="color:#1e293b">${ticket.title}</strong>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 24px">
    <a href="${link}"
       style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;
              padding:10px 20px;border-radius:6px;font-size:14px;font-weight:bold">
      Talebi Görüntüle →
    </a>
  </p>`;
}

// ─── Bildirim fonksiyonları ───────────────────────────────────────────────────

/**
 * Yeni ticket açıldığında → açana onay + ilgili gruba haber
 * @param {object} ticket     — Prisma ticket (createdBy dahil)
 * @param {string} [groupName] — Otomatik atanan grubun adı (opsiyonel)
 */
async function notifyTicketCreated(ticket, groupName) {
  const groupEmail  = groupName ? getGroupEmail(groupName) : null;
  const adminEmails = [ADMIN_EMAIL, groupEmail].filter(Boolean);
  // Tekrar eden adresleri çıkar
  const recipients  = [...new Set(adminEmails)];
  const creatorEmail = ticket.createdBy?.email;

  // Açana onay
  if (creatorEmail) {
    await sendMail({
      to:      creatorEmail,
      subject: `[Portal] Talebiniz alındı — #${ticket.id}`,
      html: template({
        title: 'Talebiniz başarıyla oluşturuldu',
        body: `
          <p style="color:#475569;margin:0 0 16px">Sayın <strong>${ticket.createdBy.displayName}</strong>,</p>
          <p style="color:#475569;margin:0 0 16px">
            Destek talebiniz alınmıştır. Ekibimiz en kısa sürede değerlendirip size geri dönecektir.
          </p>
          ${ticketBox(ticket)}`,
      }),
    });
  }

  // İlgili gruba (ve/veya Bilgi İşlem'e)
  if (recipients.length > 0) {
    const groupNote = groupName
      ? `<p style="color:#475569;margin:0 0 8px">
           Otomatik Yönlendirme: <strong style="color:#1d4ed8">${groupName}</strong> grubuna atandı.
         </p>`
      : '';
    await sendMail({
      to:      recipients,
      subject: `[Portal] Yeni Talep #${ticket.id} — ${ticket.title}`,
      html: template({
        title: 'Yeni destek talebi açıldı',
        body: `
          <p style="color:#475569;margin:0 0 16px">
            <strong>${ticket.createdBy?.displayName || 'Bir kullanıcı'}</strong>
            tarafından yeni bir talep oluşturuldu.
          </p>
          ${groupNote}
          ${ticketBox(ticket)}`,
      }),
    });
  }
}

/**
 * Ticket atandığında veya yeniden atandığında → atanan kişiye
 * @param {object} ticket        — güncel ticket (assignedTo, group dahil)
 * @param {string} assignedByName
 * @param {boolean} isReassign
 */
async function notifyTicketAssigned(ticket, assignedByName, isReassign = false) {
  const toEmail = ticket.assignedTo?.email;
  if (!toEmail) return;

  const verb = isReassign ? 'yeniden atandı' : 'atandı';

  await sendMail({
    to:      toEmail,
    subject: `[Portal] Talep size ${verb} — #${ticket.id}`,
    html: template({
      title: `Bir talep size ${verb}`,
      body: `
        <p style="color:#475569;margin:0 0 16px">
          Sayın <strong>${ticket.assignedTo.displayName}</strong>,
        </p>
        <p style="color:#475569;margin:0 0 16px">
          Aşağıdaki talep <strong>${assignedByName}</strong> tarafından size ${verb}.
          ${ticket.group ? `Grup: <strong>${ticket.group.name}</strong>` : ''}
        </p>
        ${ticketBox(ticket)}`,
    }),
  });
}

/**
 * Status RESOLVED olduğunda → talebi açan kişiye
 * @param {object} ticket  — createdBy dahil
 * @param {string} resolvedByName
 */
async function notifyTicketResolved(ticket, resolvedByName) {
  const toEmail = ticket.createdBy?.email;
  if (!toEmail) return;

  await sendMail({
    to:      toEmail,
    subject: `[Portal] Talebiniz çözüldü — #${ticket.id}`,
    html: template({
      title: 'Talebiniz çözüldü',
      body: `
        <p style="color:#475569;margin:0 0 16px">
          Sayın <strong>${ticket.createdBy.displayName}</strong>,
        </p>
        <p style="color:#475569;margin:0 0 16px">
          Destek talebiniz <strong>${resolvedByName}</strong> tarafından çözüldü olarak işaretlendi.
          Talebi inceleyerek onaylayabilir veya yeniden açabilirsiniz.
        </p>
        ${ticketBox(ticket)}`,
    }),
  });
}

/**
 * SLA ihlali yaklaşıyor (1 saat kala) → atanan kişiye
 * @param {object} ticket  — assignedTo dahil
 */
async function notifySlaWarning(ticket) {
  const toEmail = ticket.assignedTo?.email;
  if (!toEmail) return;

  await sendMail({
    to:      toEmail,
    subject: `[Portal] ⚠️ SLA Uyarısı — #${ticket.id} 1 saat içinde son bulacak`,
    html: template({
      title: '⚠️ SLA Süresi Dolmak Üzere',
      body: `
        <p style="color:#475569;margin:0 0 16px">
          Sayın <strong>${ticket.assignedTo.displayName}</strong>,
        </p>
        <p style="color:#dc2626;font-weight:bold;margin:0 0 16px">
          Aşağıdaki talebin son tarihi 1 saat içinde dolacak!
        </p>
        ${ticketBox(ticket)}
        <p style="color:#475569;margin:0">
          Son tarih: <strong>${new Date(ticket.dueDate).toLocaleString('tr-TR')}</strong>
        </p>`,
    }),
  });
}

/**
 * SLA ihlali gerçekleştiğinde → atanan kişi + bilgislem@mugla.bel.tr
 * @param {object} ticket  — assignedTo dahil
 */
async function notifySlaBreach(ticket) {
  const recipients = [ticket.assignedTo?.email, ADMIN_EMAIL].filter(Boolean);
  if (recipients.length === 0) return;

  await sendMail({
    to:      recipients,
    subject: `[Portal] ⚠️ SLA İhlali — #${ticket.id}: ${ticket.title}`,
    html: template({
      title: '⚠️ SLA İhlali',
      body: `
        <p style="color:#dc2626;font-weight:bold;margin:0 0 16px">
          Aşağıdaki talebin SLA süresi doldu!
        </p>
        ${ticket.assignedTo ? `
        <p style="color:#475569;margin:0 0 16px">
          Atanan kişi: <strong>${ticket.assignedTo.displayName}</strong>
        </p>` : ''}
        ${ticketBox(ticket)}
        <p style="color:#475569;margin:0">
          Son tarih: <strong>${new Date(ticket.dueDate).toLocaleString('tr-TR')}</strong>
        </p>`,
    }),
  });
}

module.exports = {
  notifyTicketCreated,
  notifyTicketAssigned,
  notifyTicketResolved,
  notifySlaWarning,
  notifySlaBreach,
};
