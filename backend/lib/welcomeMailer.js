'use strict';
const prisma       = require('./prisma');
const { sendMail } = require('./mailer');

async function sendWelcomeMails() {
  // Son 25 saatte AD'ye eklenen ve henüz mail gönderilmemiş aktif personel
  const since = new Date(Date.now() - 25 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: {
      adCreatedAt:     { gte: since },
      email:           { not: null },
      welcomeMailSent: false,
    },
    select: {
      id: true, displayName: true, email: true,
      title: true, directorate: true, department: true,
    },
  });

  let sent = 0, failed = 0;

  for (const user of users) {
    const daire = user.directorate || user.department || 'kurumumuzda';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0f172a,#1e40af);padding:40px 32px;text-align:center;">
      <div style="font-size:56px;margin-bottom:8px;">🏛️</div>
      <h1 style="color:white;margin:0;font-size:26px;font-weight:700;">Muğla Büyükşehir Belediyesi'ne</h1>
      <h2 style="color:#93c5fd;margin:8px 0 0;font-size:20px;font-weight:500;">Hoş Geldiniz!</h2>
    </div>
    <div style="padding:32px;">
      <p style="font-size:18px;color:#0f172a;margin:0 0 16px;">
        Sayın <strong>${user.displayName}</strong>,
      </p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Muğla Büyükşehir Belediyesi ailesine katıldığınız için çok memnunuz.
        <strong>${daire}</strong> görevinizde başarılar dileriz.
      </p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 32px;">
        Kurumumuzun değerlerine katkıda bulunacağınıza, ekibimizle uyum içinde çalışacağınıza inanıyoruz.
        Herhangi bir konuda destek için Bilgi İşlem Dairesi Başkanlığı'na başvurabilirsiniz.
      </p>
      <div style="background:#eff6ff;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#1e40af;font-weight:600;">📋 Bilgi İşlem Destek Portalı</p>
        <p style="margin:8px 0 0;font-size:13px;color:#3b82f6;">
          Teknik destek, yazılım talepleri ve IT hizmetleri için kurumsal portal adresinize başvurabilirsiniz.
        </p>
      </div>
      <div style="border-top:1px solid #e2e8f0;margin:24px 0;"></div>
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="width:48px;height:48px;background:#1e40af;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:18px;">AA</div>
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
        subject: `🏛️ Muğla Büyükşehir Belediyesi'ne Hoş Geldiniz — ${user.displayName}`,
        html,
      });
      await prisma.user.update({ where: { id: user.id }, data: { welcomeMailSent: true } });
      sent++;
    } catch (e) {
      console.error(`[WelcomeMailer] Hata (${user.email}):`, e.message);
      failed++;
    }
  }

  const statusVal = JSON.stringify({
    status:  'ok',
    message: `${sent} mail gönderildi${failed ? `, ${failed} hata` : ''}`,
    lastRun: new Date(),
  });
  await prisma.setting.upsert({
    where:  { key: 'SERVICE_STATUS_WELCOME_MAIL' },
    update: { value: statusVal },
    create: { key: 'SERVICE_STATUS_WELCOME_MAIL', value: statusVal },
  });

  console.log(`[WelcomeMailer] ${sent} gönderildi, ${failed} hata`);
  return { sent, failed, total: users.length };
}

module.exports = { sendWelcomeMails };
