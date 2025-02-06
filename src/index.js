require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const socketIO = require('socket.io');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const WebSocketService = require('./services/websocket.service');

// Routes
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

// Middlewares
const errorHandler = require('./middlewares/error.middleware');
const { globalLimiter, authLimiter, uploadLimiter, apiLimiter } = require('./middlewares/rateLimiter.middleware');

const app = express();
const httpServer = createServer(app);
const io = socketIO(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// WebSocket servisi başlat
const webSocketService = new WebSocketService(io);

// Multer yapılandırması
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Socket.io middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Multer middleware
app.use((req, res, next) => {
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'photo', maxCount: 1 }
  ])(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        error: 'Dosya yükleme hatası: ' + err.message
      });
    } else if (err) {
      return res.status(500).json({
        success: false,
        error: 'Sunucu hatası'
      });
    }
    next();
  });
});

// Rate limiting
app.use(globalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/posts', uploadLimiter);
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/moderator', moderatorRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/audio-effects', audioEffectRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/progress', userProgressRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/audio-processor', audioProcessorRoutes);
app.use('/api/security', securityRoutes);

// Error handling
app.use(errorHandler);

// WebSocket bağlantı yönetimi
io.on('connection', (socket) => {
  console.log('Yeni bir kullanıcı bağlandı:', socket.id);

  // Kullanıcı kimliğine göre odaya katıl
  socket.on('join', (userId) => {
    socket.join(userId);
  });

  socket.on('disconnect', () => {
    console.log('Kullanıcı ayrıldı:', socket.id);
  });
});

// MongoDB bağlantısı ve sunucuyu başlat
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB bağlantısı başarılı');
    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
      console.log(`Sunucu ${PORT} portunda çalışıyor`);
    });
  })
  .catch((err) => {
    console.error('MongoDB bağlantı hatası:', err);
    process.exit(1);
  });

module.exports = app; 