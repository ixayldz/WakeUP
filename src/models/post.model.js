const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  audioUrl: {
    type: String,
    required: [true, 'Ses kaydı zorunludur']
  },
  duration: {
    type: Number,
    required: [true, 'Ses kaydı süresi zorunludur'],
    max: [20, 'Ses kaydı en fazla 20 saniye olabilir']
  },
  photoUrl: {
    type: String
  },
  categories: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Category'
  }],
  likes: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    audioUrl: {
      type: String,
      required: [true, 'Yorum ses kaydı zorunludur']
    },
    duration: {
      type: Number,
      required: [true, 'Yorum ses kaydı süresi zorunludur'],
      max: [20, 'Yorum ses kaydı en fazla 20 saniye olabilir']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  reposts: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  hashtags: [{
    type: String,
    trim: true
  }],
  isReported: {
    type: Boolean,
    default: false
  },
  reports: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      required: true,
      enum: [
        'spam',
        'inappropriate_content',
        'hate_speech',
        'violence',
        'harassment',
        'copyright',
        'other'
      ]
    },
    description: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// İndeksler
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ isReported: 1 });
postSchema.index({ categories: 1 });

// Virtual fields
postSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

postSchema.virtual('commentsCount').get(function() {
  return this.comments.length;
});

postSchema.virtual('repostsCount').get(function() {
  return this.reposts.length;
});

postSchema.virtual('reportsCount').get(function() {
  return this.reports.length;
});

module.exports = mongoose.model('Post', postSchema); 