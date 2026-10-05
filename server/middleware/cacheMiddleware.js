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
 * Cache keys are `__express__<originalUrl>`, and `originalUrl` carries the query
 * string — so one menu read fans out into a separate cached copy per filter
 * combination (`/api/foods?category=..&available=true`, `/api/categories?type=drink`,
 * ...). A single write therefore has no one key to delete; the whole namespace is
 * the invalidation unit for any menu mutation.
 *
 * Every controller that writes to Food or Category MUST call
 * `clearCache(MENU_CACHE_PATTERN)`. Omitting it does not fail the write — it makes
 * the admin page re-read the pre-write payload and keep rendering the old menu
 * until the TTL lapses (10 min for foods, 1 hour for categories), which reads to
 * the user as "my edit saved but nothing changed".
 */
const MENU_CACHE_PATTERN = '__express__/api/*';

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
  MENU_CACHE_PATTERN,
};
