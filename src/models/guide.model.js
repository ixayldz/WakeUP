const mongoose = require('mongoose');

const guideSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['tutorial', 'tip', 'feature_guide', 'best_practice'],
    required: true
  },
  content: {
    text: String,
    videoUrl: String,
    audioUrl: String,
    images: [String]
  },
  targetAudience: {
    userType: {
      type: String,
      enum: ['new', 'regular', 'creator', 'all'],
      default: 'all'
    },
    userLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all'],
      default: 'all'
    }
  },
  feature: {
    type: String,
    enum: [
      'audio_recording',
      'effects',
      'categories',
      'collaboration',
      'messaging',
      'profile',
      'general'
    ],
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  showOnce: {
    type: Boolean,
    default: false
  },
  statistics: {
    views: {
      type: Number,
      default: 0
    },
    helpfulCount: {
      type: Number,
      default: 0
    },
    completionCount: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// İndeksler
guideSchema.index({ type: 1, feature: 1 });
guideSchema.index({ 'targetAudience.userType': 1 });
guideSchema.index({ order: 1 });

module.exports = mongoose.model('Guide', guideSchema); 