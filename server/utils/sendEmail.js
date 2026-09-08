const nodemailer = require('nodemailer');

const sendWithResend = async ({ to, subject, text, html }) => {
  const { RESEND_API_KEY, RESEND_FROM_EMAIL, EMAIL_FROM } = process.env;

  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    throw new Error('Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL in server/.env.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.message || 'Failed to send email via Resend.';
    throw new Error(message);
  }

  return payload;
};

const sendWithSmtp = async ({ to, subject, text, html }) => {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
    throw new Error('Email service is not configured. Add SMTP settings or Resend credentials to server/.env.');
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({ from: EMAIL_FROM, to, subject, text, html });
};

const sendEmail = async ({ to, subject, text, html }) => {
  const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();

  if (provider === 'resend') {
    return sendWithResend({ to, subject, text, html });
  }

  return sendWithSmtp({ to, subject, text, html });
};

module.exports = sendEmail;
