const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
  advertiser: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['audio', 'banner', 'sponsored_post'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Başlık en fazla 100 karakter olabilir']
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Açıklama en fazla 500 karakter olabilir']
  },
  mediaUrl: {
    type: String,
    required: true
  },
  targetAudience: {
    ageRange: {
      min: Number,
      max: Number
    },
    gender: {
      type: String,
      enum: ['all', 'male', 'female', 'other']
    },
    interests: [{
      type: String
    }],
    location: {
      type: String
    }
  },
  budget: {
    type: Number,
    required: true,
    min: [0, 'Bütçe 0\'dan küçük olamaz']
  },
  costPerView: {
    type: Number,
    required: true,
    min: [0, 'Görüntüleme başına maliyet 0\'dan küçük olamaz']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'paused', 'completed', 'rejected'],
    default: 'pending'
  },
  statistics: {
    views: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    engagement: {
      type: Number,
      default: 0
    },
    spent: {
      type: Number,
      default: 0
    }
  },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  moderationNotes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// İndeksler
advertisementSchema.index({ status: 1, startDate: 1, endDate: 1 });
advertisementSchema.index({ advertiser: 1 });
advertisementSchema.index({ 'targetAudience.interests': 1 });

module.exports = mongoose.model('Advertisement', advertisementSchema); 