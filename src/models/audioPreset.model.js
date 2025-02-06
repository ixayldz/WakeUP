const mongoose = require('mongoose');

const audioPresetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  creator: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['voice', 'music', 'ambient', 'effect', 'other'],
    required: true
  },
  effects: [{
    type: {
      type: String,
      required: true,
      enum: ['echo', 'reverb', 'pitch', 'tempo', 'bass', 'treble']
    },
    settings: {
      delay: Number,
      decay: Number,
      value: Number,
      gain: Number
    }
  }],
  description: {
    type: String,
    maxlength: [200, 'Açıklama en fazla 200 karakter olabilir']
  },
  tags: [{
    type: String,
    trim: true
  }],
  statistics: {
    usageCount: {
      type: Number,
      default: 0
    },
    favoriteCount: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    ratingCount: {
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
audioPresetSchema.index({ creator: 1 });
audioPresetSchema.index({ category: 1 });
audioPresetSchema.index({ isPublic: 1, 'statistics.usageCount': -1 });
audioPresetSchema.index({ tags: 1 });

module.exports = mongoose.model('AudioPreset', audioPresetSchema); 