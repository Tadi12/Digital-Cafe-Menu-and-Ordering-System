const Redis = require('ioredis');

const redisClient = process.env.REDIS_URI 
  ? new Redis(process.env.REDIS_URI) 
  : null;

if (redisClient) {
  redisClient.on('connect', () => {
    console.log('[Redis Connected]: Cache layer initialized');
  });

  redisClient.on('error', (err) => {
    console.error('[Redis Error]:', err.message);
  });
} else {
  console.log('[Redis Warning]: REDIS_URI not provided. Caching will be bypassed.');
}

module.exports = redisClient;
