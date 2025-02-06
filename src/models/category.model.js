const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    maxlength: [500, 'Açıklama en fazla 500 karakter olabilir']
  },
  icon: {
    type: String
  },
  color: {
    type: String,
    default: '#000000'
  },
  parentCategory: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  statistics: {
    postCount: {
      type: Number,
      default: 0
    },
    followerCount: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// İndeksler
categorySchema.index({ slug: 1 });
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ order: 1 });
categorySchema.index({ 'statistics.postCount': -1 });
categorySchema.index({ 'statistics.followerCount': -1 });

// Alt kategorileri getir
categorySchema.virtual('subCategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory'
});

// Şema ayarları
categorySchema.set('toJSON', { virtuals: true });
categorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Category', categorySchema); 