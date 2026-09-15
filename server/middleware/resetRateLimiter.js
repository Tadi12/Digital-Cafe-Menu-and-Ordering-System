const MAX_REQUESTS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const resetRequests = new Map();

const resetRateLimiter = (req, res, next) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const email =
    typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
  const key = `${ip}:${email}`;
  const now = Date.now();

  if (!resetRequests.has(key)) {
    resetRequests.set(key, { count: 1, resetTime: now + WINDOW_MS });
    return next();
  }

  const requestData = resetRequests.get(key);

  if (now > requestData.resetTime) {
    resetRequests.set(key, { count: 1, resetTime: now + WINDOW_MS });
    return next();
  }

  if (requestData.count >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: 'Too many password reset requests. Please try again after an hour.',
    });
  }

  requestData.count++;
  return next();
};

// Cleanup interval to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of resetRequests.entries()) {
    if (now > data.resetTime) {
      resetRequests.delete(ip);
    }
  }
}, WINDOW_MS);

module.exports = resetRateLimiter;
