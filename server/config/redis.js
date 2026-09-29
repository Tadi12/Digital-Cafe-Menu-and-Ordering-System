const Redis = require('ioredis');

const redisUri = process.env.REDIS_URI || process.env.REDIS_URL;

const redisClient = redisUri 
  ? new Redis(redisUri) 
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
