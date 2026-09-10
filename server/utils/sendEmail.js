const MAILERSEND_EMAIL_ENDPOINT = 'https://api.mailersend.com/v1/email';

const sendEmail = async ({ to, subject, text, html }) => {
  const { MAILERSEND_API_KEY, MAILERSEND_FROM_EMAIL, MAILERSEND_FROM_NAME } = process.env;

  if (!MAILERSEND_API_KEY || !MAILERSEND_FROM_EMAIL) {
    throw new Error('MailerSend is not configured. Set MAILERSEND_API_KEY and MAILERSEND_FROM_EMAIL in server/.env.');
  }

  const response = await fetch(MAILERSEND_EMAIL_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MAILERSEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: { email: MAILERSEND_FROM_EMAIL, ...(MAILERSEND_FROM_NAME ? { name: MAILERSEND_FROM_NAME } : {}) },
      to: [{ email: to }],
      subject,
      text,
      html,
    }),
  });

  // MailerSend queues a successful message with HTTP 202 and supplies x-message-id.
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const details = [
      payload?.message,
      payload?.errors && JSON.stringify(payload.errors),
    ].filter(Boolean).join(' ');
    const error = new Error(details || 'MailerSend could not queue the email.');
    error.status = response.status;
    throw error;
  }

  return { messageId: response.headers.get('x-message-id') };
};

module.exports = sendEmail;
