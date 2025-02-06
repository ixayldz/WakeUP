const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  completedGuides: [{
    guide: {
      type: mongoose.Schema.ObjectId,
      ref: 'Guide'
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    wasHelpful: Boolean
  }],
  featureUsage: {
    audioRecording: {
      used: { type: Boolean, default: false },
      count: { type: Number, default: 0 },
      lastUsed: Date
    },
    effects: {
      used: { type: Boolean, default: false },
      count: { type: Number, default: 0 },
      lastUsed: Date,
      favoriteEffects: [String]
    },
    categories: {
      used: { type: Boolean, default: false },
      count: { type: Number, default: 0 },
      lastUsed: Date
    },
    collaboration: {
      used: { type: Boolean, default: false },
      count: { type: Number, default: 0 },
      lastUsed: Date
    },
    messaging: {
      used: { type: Boolean, default: false },
      count: { type: Number, default: 0 },
      lastUsed: Date
    }
  },
  preferences: {
    showTips: {
      type: Boolean,
      default: true
    },
    tipFrequency: {
      type: String,
      enum: ['always', 'daily', 'weekly', 'never'],
      default: 'daily'
    }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// İndeksler
userProgressSchema.index({ user: 1 });
userProgressSchema.index({ lastActivity: -1 });
userProgressSchema.index({ 'completedGuides.completedAt': -1 });

module.exports = mongoose.model('UserProgress', userProgressSchema); 