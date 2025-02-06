const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const config = require('../config');
const logger = require('../utils/logger');

// CORS yapılandırması
const corsOptions = {
  origin: config.cors.origin,
  methods: config.cors.methods.split(','),
  credentials: config.cors.credentials,
  maxAge: 86400 // 24 saat
};

// Güvenlik başlıkları için Helmet yapılandırması
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://s3.amazonaws.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
};

// HPP için güvenli parametreler
const whitelist = [
  'duration',
  'createdAt',
  'sort',
  'page',
  'limit',
  'fields'
];

// Güvenlik middleware'lerini dışa aktar
const securityMiddleware = [
  // CORS
  cors(corsOptions),

  // Temel güvenlik başlıkları
  helmet(helmetConfig),

  // XSS koruması
  xss(),

  // Parameter pollution koruması
  hpp({
    whitelist
  }),

  // Özel güvenlik başlıkları
  (req, res, next) => {
    // Ek güvenlik başlıkları
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // Güvenlik loglaması
    logger.security('Güvenlik başlıkları uygulandı', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });

    next();
  }
];

module.exports = securityMiddleware; 