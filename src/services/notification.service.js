const Notification = require('../models/notification.model');
const User = require('../models/user.model');

class NotificationService {
  constructor(io) {
    this.io = io;
  }

  // Bildirim oluştur
  async createNotification(userId, type, data) {
    const notification = await Notification.create({
      user: userId,
      type,
      data
    });

    // WebSocket ile anlık bildirim gönder
    this.io.to(userId.toString()).emit('notification', {
      type: 'new',
      notification
    });

    return notification;
  }

  // İşbirliği daveti gönder
  async sendCollaborationInvite(senderId, receiverId, collaborationId) {
    const notification = await this.createNotification(receiverId, 'collaboration_invite', {
      senderId,
      collaborationId,
      timestamp: Date.now()
    });

    return notification;
  }

  // İşbirliği güncellemesi gönder
  async sendCollaborationUpdate(userId, collaborationId, status, message) {
    const notification = await this.createNotification(userId, 'collaboration_update', {
      collaborationId,
      status,
      message,
      timestamp: Date.now()
    });

    return notification;
  }

  // Mesaj bildirimi gönder
  async sendMessageNotification(receiverId, senderId, messageId, messagePreview) {
    const notification = await this.createNotification(receiverId, 'new_message', {
      senderId,
      messageId,
      messagePreview,
      timestamp: Date.now()
    });

    return notification;
  }

  // Bildirimleri okundu olarak işaretle
  async markAsRead(userId, notificationIds) {
    const notifications = await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        user: userId
      },
      { $set: { isRead: true } }
    );

    // WebSocket ile bildirim güncelleme gönder
    this.io.to(userId.toString()).emit('notification', {
      type: 'read',
      notificationIds
    });

    return notifications;
  }

  // Bildirimleri sil
  async deleteNotifications(userId, notificationIds) {
    const notifications = await Notification.deleteMany({
      _id: { $in: notificationIds },
      user: userId
    });

    // WebSocket ile bildirim silme gönder
    this.io.to(userId.toString()).emit('notification', {
      type: 'delete',
      notificationIds
    });

    return notifications;
  }

  // Kullanıcının bildirimlerini getir
  async getUserNotifications(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false
    } = options;

    const query = { user: userId };
    if (unreadOnly) {
      query.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query)
    ]);

    return {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Okunmamış bildirim sayısını getir
  async getUnreadCount(userId) {
    return await Notification.countDocuments({
      user: userId,
      isRead: false
    });
  }

  // Tüm bildirimleri okundu olarak işaretle
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true } }
    );

    // WebSocket ile tüm bildirimlerin okunduğunu bildir
    this.io.to(userId.toString()).emit('notification', {
      type: 'readAll'
    });

    return result;
  }

  // Eski bildirimleri temizle
  async cleanupOldNotifications(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true
    });
  }
}

module.exports = NotificationService; 