const mongoose = require('mongoose');

const collaborationSchema = new mongoose.Schema({
  initiator: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  partner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['duet', 'remix', 'feature', 'other'],
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
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  originalContent: {
    type: mongoose.Schema.ObjectId,
    ref: 'Post',
    required: true
  },
  collaborativeContent: {
    type: mongoose.Schema.ObjectId,
    ref: 'Post'
  },
  terms: {
    profitSharing: {
      initiator: {
        type: Number,
        min: 0,
        max: 100,
        required: true
      },
      partner: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
        validate: {
          validator: function(v) {
            return this.terms.profitSharing.initiator + v === 100;
          },
          message: 'Kâr paylaşım oranları toplamı 100 olmalıdır'
        }
      }
    },
    deadline: {
      type: Date,
      required: true
    },
    additionalTerms: String
  },
  messages: [{
    sender: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
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
collaborationSchema.index({ initiator: 1, partner: 1 });
collaborationSchema.index({ status: 1 });
collaborationSchema.index({ type: 1 });

// Pre-save middleware
collaborationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Collaboration', collaborationSchema); 