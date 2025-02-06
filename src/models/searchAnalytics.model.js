const mongoose = require('mongoose');

const searchAnalyticsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  query: {
    type: String,
    required: true,
    trim: true
  },
  filters: {
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    tags: [String],
    dateRange: {
      start: Date,
      end: Date
    },
    duration: {
      min: Number,
      max: Number
    },
    customFilters: mongoose.Schema.Types.Mixed
  },
  resultCount: {
    type: Number,
    required: true,
    min: 0
  },
  selectedResult: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: false
  },
  duration: {
    type: Number,
    required: true,
    min: 0
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  userAgent: String,
  platform: String,
  location: {
    country: String,
    city: String,
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  sessionId: String
}, {
  timestamps: true
});

// İndeksler
searchAnalyticsSchema.index({ user: 1, timestamp: -1 });
searchAnalyticsSchema.index({ query: 1, timestamp: -1 });
searchAnalyticsSchema.index({ 'filters.categories': 1 });
searchAnalyticsSchema.index({ 'filters.tags': 1 });
searchAnalyticsSchema.index({ timestamp: -1 });

// Sanal alanlar
searchAnalyticsSchema.virtual('searchSuccess').get(function() {
  return this.resultCount > 0;
});

searchAnalyticsSchema.virtual('hasSelection').get(function() {
  return !!this.selectedResult;
});

// Metodlar
searchAnalyticsSchema.methods.addCustomFilter = function(key, value) {
  if (!this.filters.customFilters) {
    this.filters.customFilters = {};
  }
  this.filters.customFilters[key] = value;
  return this.save();
};

searchAnalyticsSchema.methods.updateLocation = async function(coordinates, country, city) {
  this.location = {
    coordinates,
    country,
    city
  };
  return this.save();
};

// Statik metodlar
searchAnalyticsSchema.statics.getPopularQueries = async function(timeframe = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - timeframe);

  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        resultCount: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: '$query',
        count: { $sum: 1 },
        successRate: {
          $avg: { $cond: [{ $gt: ['$resultCount', 0] }, 1, 0] }
        },
        avgResults: { $avg: '$resultCount' }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 20
    }
  ]);
};

searchAnalyticsSchema.statics.getUserSearchHistory = async function(userId, limit = 10) {
  return this.find({ user: userId })
    .sort('-timestamp')
    .limit(limit)
    .populate('selectedResult')
    .lean();
};

searchAnalyticsSchema.statics.getSearchTrends = async function(timeframe = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - timeframe);

  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d %H:00',
            date: '$timestamp'
          }
        },
        searches: { $sum: 1 },
        avgResults: { $avg: '$resultCount' },
        successRate: {
          $avg: { $cond: [{ $gt: ['$resultCount', 0] }, 1, 0] }
        }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);
};

// Middleware
searchAnalyticsSchema.pre('save', function(next) {
  // Boş sorguları engelle
  if (!this.query.trim()) {
    return next(new Error('Arama sorgusu boş olamaz'));
  }

  // Timestamp kontrolü
  if (!this.timestamp) {
    this.timestamp = new Date();
  }

  next();
});

const SearchAnalytics = mongoose.model('SearchAnalytics', searchAnalyticsSchema);

module.exports = SearchAnalytics; 