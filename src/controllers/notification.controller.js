const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const NotificationService = require('../services/notification.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

let notificationService;

// WebSocket bağlantısını başlat
const initializeService = (io) => {
  notificationService = new NotificationService(io);
};

// Bildirimleri getir
const getNotifications = catchAsync(async (req, res, next) => {
  const { page, limit, unreadOnly } = req.query;
  
  const result = await notificationService.getUserNotifications(req.user.id, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    unreadOnly: unreadOnly === 'true'
  });

  res.status(200).json({
    status: 'success',
    data: result
  });
});

// Okunmamış bildirim sayısını getir
const getUnreadCount = catchAsync(async (req, res, next) => {
  const count = await notificationService.getUnreadCount(req.user.id);

  res.status(200).json({
    status: 'success',
    data: { count }
  });
});

// Bildirimleri okundu olarak işaretle
const markAsRead = catchAsync(async (req, res, next) => {
  const { notificationIds } = req.body;

  if (!notificationIds || !Array.isArray(notificationIds)) {
    return next(new AppError('Bildirim ID\'leri gerekli ve dizi formatında olmalıdır', 400));
  }

  await notificationService.markAsRead(req.user.id, notificationIds);

  res.status(200).json({
    status: 'success',
    message: 'Bildirimler okundu olarak işaretlendi'
  });
});

// Tüm bildirimleri okundu olarak işaretle
const markAllAsRead = catchAsync(async (req, res, next) => {
  await notificationService.markAllAsRead(req.user.id);

  res.status(200).json({
    status: 'success',
    message: 'Tüm bildirimler okundu olarak işaretlendi'
  });
});

// Bildirimleri sil
const deleteNotifications = catchAsync(async (req, res, next) => {
  const { notificationIds } = req.body;

  if (!notificationIds || !Array.isArray(notificationIds)) {
    return next(new AppError('Bildirim ID\'leri gerekli ve dizi formatında olmalıdır', 400));
  }

  await notificationService.deleteNotifications(req.user.id, notificationIds);

  res.status(200).json({
    status: 'success',
    message: 'Bildirimler silindi'
  });
});

// Bildirim tercihlerini güncelle
const updatePreferences = catchAsync(async (req, res, next) => {
  const { preferences } = req.body;

  if (!preferences || typeof preferences !== 'object') {
    return next(new AppError('Geçerli bildirim tercihleri gereklidir', 400));
  }

  await User.findByIdAndUpdate(req.user.id, {
    'notifications.preferences': preferences
  });

  res.status(200).json({
    status: 'success',
    message: 'Bildirim tercihleri güncellendi'
  });
});

// Test bildirimi gönder (sadece geliştirme ortamında)
const sendTestNotification = catchAsync(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    throw new AppError('Bu endpoint sadece geliştirme ortamında kullanılabilir', 403);
  }

  const { type, data } = req.body;

  const notification = await notificationService.createNotification(
    req.user.id,
    type,
    data
  );

  res.status(200).json({
    status: 'success',
    message: 'Test bildirimi gönderildi',
    data: { notification }
  });
});

module.exports = {
  initializeService,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotifications,
  updatePreferences,
  sendTestNotification
}; 