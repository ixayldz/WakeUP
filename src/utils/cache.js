const Redis = require('redis');

const client = Redis.createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT)
  }
});

client.on('error', (err) => console.error('Redis Client Error:', err));
client.on('connect', () => console.log('Redis Client Connected'));

client.connect().catch(console.error);

// Cache'den veri al
exports.getCache = async (key) => {
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Cache get error:', err);
    return null;
  }
};

// Cache'e veri kaydet
exports.setCache = async (key, value, expireTime = 3600) => {
  try {
    const stringValue = JSON.stringify(value);
    await client.setEx(key, expireTime, stringValue);
    return true;
  } catch (err) {
    console.error('Cache set error:', err);
    return false;
  }
};

// Cache'den veri sil
exports.deleteCache = async (key) => {
  try {
    await client.del(key);
    return true;
  } catch (err) {
    console.error('Cache delete error:', err);
    return false;
  }
};

// Cache'i temizle
exports.clearCache = async () => {
  try {
    await client.flushAll();
    return true;
  } catch (err) {
    console.error('Cache clear error:', err);
    return false;
  }
};

// Cache middleware
exports.cacheMiddleware = (duration = 3600) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `__cache__${req.originalUrl || req.url}`;

    try {
      const cachedData = await exports.getCache(key);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // Response'u yakala
      const originalJson = res.json;
      res.json = function(data) {
        exports.setCache(key, JSON.stringify(data), duration);
        originalJson.call(this, data);
      };

      next();
    } catch (err) {
      console.error('Cache middleware error:', err);
      next();
    }
  };
};

module.exports.client = client; 