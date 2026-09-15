const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text, html }) => {
  const BREVO_SMTP_USER = process.env.BREVO_SMTP_USER?.trim();
  const BREVO_SMTP_KEY = process.env.BREVO_SMTP_KEY?.trim();
  const SENDER_EMAIL = process.env.SENDER_EMAIL?.trim();

  if (!BREVO_SMTP_USER || !BREVO_SMTP_KEY || !SENDER_EMAIL) {
    throw new Error('SMTP is not configured. Set BREVO_SMTP_USER, BREVO_SMTP_KEY, and SENDER_EMAIL in server/.env.');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // TLS via STARTTLS
    requireTLS: true,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: BREVO_SMTP_USER,
      pass: BREVO_SMTP_KEY,
    },
  });

  const result = await transporter.sendMail({
    from: { name: 'Hable Cafe', address: SENDER_EMAIL },
    to,
    subject,
    text,
    html,
  });

  return { messageId: result.messageId };
};

module.exports = sendEmail;
