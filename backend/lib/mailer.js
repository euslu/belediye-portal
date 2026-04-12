const nodemailer = require('nodemailer');
const { getTlsOptions } = require('../utils/tls');

const ENABLED = process.env.MAIL_ENABLED === 'true';

let transporter = null;

if (ENABLED) {
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: getTlsOptions('SMTP', process.env.SMTP_HOST),
  });
}

/**
 * @param {object} opts
 * @param {string|string[]} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html
 */
async function sendMail({ to, subject, html }) {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length === 0) return;

  if (!ENABLED) {
    console.log(`[MAIL] ${subject} → ${recipients.join(', ')}`);
    return;
  }

  try {
    await transporter.sendMail({
      from:    process.env.SMTP_FROM || 'portal@mugla.bel.tr',
      to:      recipients.join(', '),
      subject,
      html,
    });
    console.log(`[MAIL] Gönderildi: ${subject} → ${recipients.join(', ')}`);
  } catch (err) {
    console.error(`[MAIL] Hata: ${err.message}`);
  }
}

module.exports = { sendMail };
