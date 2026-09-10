const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text, html }) => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM_EMAIL) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL in server/.env.');
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const result = await transporter.sendMail({
    from: SMTP_FROM_NAME ? { name: SMTP_FROM_NAME, address: SMTP_FROM_EMAIL } : SMTP_FROM_EMAIL,
    to,
    subject,
    text,
    html,
  });

  return { messageId: result.messageId };
};

module.exports = sendEmail;
