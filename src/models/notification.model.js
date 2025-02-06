const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Bildirim bir kullanıcıya ait olmalıdır']
  },
  type: {
    type: String,
    required: [true, 'Bildirim tipi gereklidir'],
    enum: [
      'collaboration_invite',
      'collaboration_update',
      'new_message',
      'mention',
      'like',
      'comment',
      'follow',
      'system'
    ]
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Bildirim verisi gereklidir']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// İndeksler
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

// Sanal alanlar
notificationSchema.virtual('isNew').get(function() {
  const NOTIFICATION_EXPIRY_HOURS = 24;
  const now = new Date();
  const diff = now - this.createdAt;
  const diffHours = diff / (1000 * 60 * 60);
  return diffHours <= NOTIFICATION_EXPIRY_HOURS;
});

// Middleware
notificationSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name avatar'
  });
  next();
});

// Statik metodlar
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    user: userId,
    isRead: false
  });
};

notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { user: userId, isRead: false },
    { $set: { isRead: true } }
  );
};

notificationSchema.statics.cleanupOldNotifications = async function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 