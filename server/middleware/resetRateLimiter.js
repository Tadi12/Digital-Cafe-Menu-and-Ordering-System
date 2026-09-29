const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// Rate limiter for password reset endpoints
const resetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // limit each IP/email to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after an hour.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  validate: { trustProxy: false },
  keyGenerator: (req, res) => {
    // Generate key using IP and email if provided, just IP otherwise
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    return `${ipKeyGenerator(req, res)}:${email}`;
  }
});

module.exports = resetRateLimiter;
