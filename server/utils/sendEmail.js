const BREVO_EMAIL_API_URL = 'https://api.brevo.com/v3/smtp/email';

const sendEmail = async ({ to, subject, text, html }) => {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.SENDER_EMAIL?.trim();
  const senderName = process.env.SENDER_NAME?.trim() || 'Hable Cafe';

  if (!apiKey || !senderEmail) {
    throw new Error('Email API is not configured. Set BREVO_API_KEY and SENDER_EMAIL in server/.env.');
  }

  const response = await fetch(BREVO_EMAIL_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = body.message || body.code || `HTTP ${response.status}`;
    throw new Error(`Brevo email API request failed: ${detail}`);
  }

  return { messageId: body.messageId };
};

module.exports = sendEmail;
