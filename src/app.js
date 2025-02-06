const advertisementRoutes = require('./routes/advertisement.routes');
const collaborationRoutes = require('./routes/collaboration.routes');
const categoryRoutes = require('./routes/category.routes');
const notificationRoutes = require('./routes/notification.routes');
const { initializeNotificationService } = require('./controllers/notification.controller');

// Rotaları bağla
app.use('/api/v1/advertisements', advertisementRoutes);
app.use('/api/v1/collaborations', collaborationRoutes);
app.use('/api/v1/categories', categoryRoutes);

// WebSocket servisleri başlat
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// WebSocket servislerini başlat
initializeWebSocketService(io);
initializeNotificationService(io);

// Bildirim rotalarını ekle
app.use('/api/notifications', notificationRoutes); 