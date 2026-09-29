const rateLimit = require('express-rate-limit');

// Global rate limiter to protect the API from DDoS or brute-force attacks
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});

module.exports = globalRateLimiter;
