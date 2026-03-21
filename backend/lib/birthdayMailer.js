'use strict';
const prisma     = require('./prisma');
const { sendMail } = require('./mailer');

async function sendBirthdayMails(targetUsername = null) {
  const today   = new Date();
  const todayMD = `${String(today.getDate()).padStart(2,'0')}.${String(today.getMonth()+1).padStart(2,'0')}`;

  const where = targetUsername
    ? { username: targetUsername, email: { not: null } }
    : { isActive: true, birthday: { contains: todayMD }, email: { not: null } };

  const users = await prisma.user.findMany({
    where,
    select: { displayName: true, email: true, title: true, directorate: true, birthday: true },
  });

  let sent = 0, failed = 0;

  for (const user of users) {
    const parts     = (user.birthday || '').split('.');
    const birthYear = parts.length === 3 ? parseInt(parts[2]) : null;
    const age       = birthYear ? today.getFullYear() - birthYear : null;

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:40px 32px;text-align:center;">
      <div style="font-size:56px;margin-bottom:8px;">🎂</div>
      <h1 style="color:white;margin:0;font-size:28px;font-weight:700;">Doğum Günün Kutlu Olsun!</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:16px;">Happy Birthday!</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:18px;color:#0f172a;margin:0 0 16px;">
        Sayın <strong>${user.displayName}</strong>,
      </p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">
        ${age ? `<strong>${age}. yaşını</strong> kutlarken, ` : ''}Muğla Büyükşehir Belediyesi ailesi olarak
        bugün sizin özel gününüz. Bu mutlu günde sağlık, mutluluk ve başarı dolu bir yıl dileriz.
      </p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 32px;">
        Kurumumuza olan katkılarınız ve özverili çalışmalarınız için teşekkür eder, nice sağlıklı ve başarılı yıllar dileriz.
      </p>
      <div style="border-top:1px solid #e2e8f0;margin:24px 0;"></div>
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="width:48px;height:48px;background:#1e40af;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:18px;flex-shrink:0;">AA</div>
        <div>
          <p style="margin:0;font-weight:700;color:#0f172a;font-size:15px;">Ahmet ARAS</p>
          <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Muğla Büyükşehir Belediye Başkanı</p>
        </div>
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:11px;margin:0;">Muğla Büyükşehir Belediyesi — Bilgi İşlem Dairesi Başkanlığı</p>
    </div>
  </div>
</body>
</html>`;

    try {
      await sendMail({
        to:      user.email,
        subject: `🎂 Doğum Günün Kutlu Olsun, ${user.displayName.split(' ')[0]}!`,
        html,
      });
      sent++;
    } catch (e) {
      console.error(`[BirthdayMailer] Hata (${user.email}):`, e.message);
      failed++;
    }
  }

  const statusVal = JSON.stringify({
    status:  failed === 0 ? 'ok' : 'warning',
    message: `${sent} mail gönderildi${failed ? `, ${failed} hata` : ''}`,
    lastRun: new Date(),
  });
  await prisma.setting.upsert({
    where:  { key: 'SERVICE_STATUS_BIRTHDAY_MAIL' },
    update: { value: statusVal },
    create: { key: 'SERVICE_STATUS_BIRTHDAY_MAIL', value: statusVal },
  });

  console.log(`[BirthdayMailer] ${sent} gönderildi, ${failed} hata`);
  return { sent, failed, total: users.length };
}

module.exports = { sendBirthdayMails };
