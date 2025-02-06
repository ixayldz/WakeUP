const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { createClient } = require('redis');

const redisClient = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT)
  }
});

redisClient.connect().catch(console.error);

// Genel rate limiter
exports.globalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // IP başına maksimum istek sayısı
  message: {
    success: false,
    error: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.'
  }
});

// Auth rate limiter
exports.authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 5, // IP başına maksimum deneme sayısı
  message: {
    success: false,
    error: 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.'
  }
});

// Upload rate limiter
exports.uploadLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 50, // IP başına maksimum yükleme sayısı
  message: {
    success: false,
    error: 'Çok fazla dosya yüklediniz. Lütfen daha sonra tekrar deneyin.'
  }
});

// API rate limiter
exports.apiLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 1000, // IP başına maksimum API isteği sayısı
  message: {
    success: false,
    error: 'API istek limitine ulaştınız. Lütfen daha sonra tekrar deneyin.'
  }
}); 