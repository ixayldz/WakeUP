const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotifications,
  updatePreferences,
  sendTestNotification
} = require('../controllers/notification.controller');

// Tüm rotalar için kimlik doğrulama gerekli
router.use(protect);

// Bildirimleri getir
router.get('/', getNotifications);

// Okunmamış bildirim sayısını getir
router.get('/unread-count', getUnreadCount);

// Bildirimleri okundu olarak işaretle
router.post('/mark-read', markAsRead);

// Tüm bildirimleri okundu olarak işaretle
router.post('/mark-all-read', markAllAsRead);

// Bildirimleri sil
router.post('/delete', deleteNotifications);

// Bildirim tercihlerini güncelle
router.patch('/preferences', updatePreferences);

// Test bildirimi gönder (sadece geliştirme ortamında)
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', sendTestNotification);
}

module.exports = router; 