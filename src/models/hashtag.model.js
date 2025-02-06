const mongoose = require('mongoose');

const hashtagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  postCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  trendScore: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// İndeksler
hashtagSchema.index({ name: 1 });
hashtagSchema.index({ trendScore: -1 });
hashtagSchema.index({ postCount: -1 });

module.exports = mongoose.model('Hashtag', hashtagSchema); 