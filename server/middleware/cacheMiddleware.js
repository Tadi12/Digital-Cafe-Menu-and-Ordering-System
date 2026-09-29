const redisClient = require('../config/redis');

/**
 * Middleware to cache GET requests.
 * @param {number} duration - Cache duration in seconds
 */
const cacheMiddleware = (duration = 3600) => {
  return async (req, res, next) => {
    // If no redis client is configured or request is not GET, bypass cache
    if (!redisClient || req.method !== 'GET') {
      return next();
    }

    const key = `__express__${req.originalUrl || req.url}`;
    
    try {
      const cachedBody = await redisClient.get(key);
      if (cachedBody) {
        return res.setHeader('Content-Type', 'application/json').send(cachedBody);
      } else {
        // Intercept res.json to store the response
        const originalJson = res.json;
        res.json = function(body) {
          redisClient.setex(key, duration, JSON.stringify(body));
          originalJson.call(this, body);
        };
        next();
      }
    } catch (err) {
      console.error('[Redis Cache Error]:', err.message);
      next(); // fallback to normal execution if redis fails
    }
  };
};

/**
 * Utility to clear specific cache patterns
 * @param {string} pattern - Redis key pattern (e.g., '__express__/api/foods*')
 */
const clearCache = async (pattern) => {
  if (!redisClient) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    console.error('[Redis Clear Error]:', err.message);
  }
};

module.exports = {
  cacheMiddleware,
  clearCache,
};
