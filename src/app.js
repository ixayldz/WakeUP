const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');
const securityMiddleware = require('./middlewares/security.middleware');
const errorHandler = require('./middlewares/error.middleware');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

// Route'ları içe aktar
const authRoutes = require('./routes/auth.routes');
const postRoutes = require('./routes/post.routes');
const messageRoutes = require('./routes/message.routes');
const moderatorRoutes = require('./routes/moderator.routes');
const notificationRoutes = require('./routes/notification.routes');
const searchRoutes = require('./routes/search.routes');
const profileRoutes = require('./routes/profile.routes');
const audioEffectRoutes = require('./routes/audioEffect.routes');
const guideRoutes = require('./routes/guide.routes');
const userProgressRoutes = require('./routes/userProgress.routes');
const recommendationRoutes = require('./routes/recommendation.routes');
const audioProcessorRoutes = require('./routes/audioProcessor.routes');
const securityRoutes = require('./routes/security.routes');

// Express uygulamasını oluştur
const app = express();

// Morgan logger'ı yapılandır
app.use(morgan('combined', {
  stream: {
    write: message => logger.http(message.trim())
  }
}));

// Güvenlik middleware'lerini uygula
app.use(securityMiddleware);

// Body parser
app.use(express.json({ limit: config.upload.maxFileSize }));
app.use(express.urlencoded({ extended: true, limit: config.upload.maxFileSize }));

// Cookie parser
app.use(cookieParser());

// API versiyonlama
const apiVersion = `/api/${config.app.apiVersion}`;

// Route'ları uygula
app.use(`${apiVersion}/auth`, authRoutes);
app.use(`${apiVersion}/posts`, postRoutes);
app.use(`${apiVersion}/messages`, messageRoutes);
app.use(`${apiVersion}/moderator`, moderatorRoutes);
app.use(`${apiVersion}/notifications`, notificationRoutes);
app.use(`${apiVersion}/search`, searchRoutes);
app.use(`${apiVersion}/profile`, profileRoutes);
app.use(`${apiVersion}/audio-effects`, audioEffectRoutes);
app.use(`${apiVersion}/guides`, guideRoutes);
app.use(`${apiVersion}/progress`, userProgressRoutes);
app.use(`${apiVersion}/recommendations`, recommendationRoutes);
app.use(`${apiVersion}/audio-processor`, audioProcessorRoutes);
app.use(`${apiVersion}/security`, securityRoutes);

// 404 handler
app.all('*', (req, res, next) => {
  logger.warn(`İstek yapılan yol bulunamadı: ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    message: `${req.originalUrl} yolu bulunamadı`
  });
});

// Hata yönetimi
app.use(errorHandler);

// Beklenmeyen hataları yakala
process.on('unhandledRejection', (err) => {
  logger.error('Yakalanmamış Promise Reddi:', err);
  // Uygulama durumunu güvenli bir şekilde sonlandır
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Yakalanmamış İstisna:', err);
  // Uygulama durumunu güvenli bir şekilde sonlandır
  process.exit(1);
});

module.exports = app; 