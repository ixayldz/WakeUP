const winston = require('winston');
const config = require('../config');

// Log formatını özelleştir
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Özel log seviyeleri
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Log seviyesini ortama göre belirle
const level = () => {
  return config.app.env === 'development' ? 'debug' : 'warn';
};

// Transport'ları yapılandır
const transports = [
  // Hata logları için
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: customFormat
  }),
  // HTTP istekleri için
  new winston.transports.File({
    filename: 'logs/http.log',
    level: 'http',
    format: customFormat
  }),
  // Tüm loglar için
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: customFormat
  })
];

// Geliştirme ortamında konsol çıktısı ekle
if (config.app.env === 'development') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );
}

// Logger'ı oluştur
const logger = winston.createLogger({
  level: level(),
  levels,
  format: customFormat,
  transports
});

// HTTP istekleri için özel logger
logger.http = (message, meta = {}) => {
  logger.log({
    level: 'http',
    message,
    timestamp: new Date().toISOString(),
    ...meta
  });
};

// Performans logları için özel logger
logger.performance = (message, duration) => {
  logger.info({
    message,
    duration,
    type: 'performance'
  });
};

// Güvenlik logları için özel logger
logger.security = (message, meta = {}) => {
  logger.warn({
    message,
    type: 'security',
    ...meta
  });
};

// Veritabanı logları için özel logger
logger.database = (message, meta = {}) => {
  logger.info({
    message,
    type: 'database',
    ...meta
  });
};

module.exports = logger; 