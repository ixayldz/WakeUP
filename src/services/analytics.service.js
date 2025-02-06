const Post = require('../models/post.model');
const User = require('../models/user.model');
const Category = require('../models/category.model');
const AudioPreset = require('../models/audioPreset.model');
const UserProgress = require('../models/userProgress.model');
const SearchAnalytics = require('../models/searchAnalytics.model');

class AnalyticsService {
  // Kullanıcı performans analizi
  static async getUserAnalytics(userId, period = '30d') {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const posts = await Post.find({
      user: userId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const interactions = {
      likes: 0,
      comments: 0,
      reposts: 0,
      views: 0
    };

    posts.forEach(post => {
      interactions.likes += post.likes.length;
      interactions.comments += post.comments.length;
      interactions.reposts += post.reposts.length;
      interactions.views += post.statistics?.views || 0;
    });

    const engagementRate = posts.length > 0 
      ? (interactions.likes + interactions.comments + interactions.reposts) / (posts.length * interactions.views) * 100 
      : 0;

    const categoryDistribution = await this.getUserCategoryDistribution(userId);
    const timeAnalysis = await this.getUserPostingTimeAnalysis(userId);
    const growthTrend = await this.getUserGrowthTrend(userId, period);

    return {
      period,
      postCount: posts.length,
      interactions,
      engagementRate,
      categoryDistribution,
      timeAnalysis,
      growthTrend
    };
  }

  // Kategori dağılımı analizi
  static async getUserCategoryDistribution(userId) {
    const posts = await Post.find({ user: userId })
      .populate('categories', 'name');

    const distribution = {};
    posts.forEach(post => {
      post.categories.forEach(category => {
        distribution[category.name] = (distribution[category.name] || 0) + 1;
      });
    });

    return distribution;
  }

  // Paylaşım zamanı analizi
  static async getUserPostingTimeAnalysis(userId) {
    const posts = await Post.find({ user: userId });

    const hourlyDistribution = new Array(24).fill(0);
    const dailyDistribution = new Array(7).fill(0);

    posts.forEach(post => {
      const date = new Date(post.createdAt);
      hourlyDistribution[date.getHours()]++;
      dailyDistribution[date.getDay()]++;
    });

    return {
      hourly: hourlyDistribution,
      daily: dailyDistribution
    };
  }

  // Büyüme trendi analizi
  static async getUserGrowthTrend(userId, period) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const user = await User.findById(userId);
    const posts = await Post.find({
      user: userId,
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort('createdAt');

    const trend = {
      followers: [],
      engagement: [],
      posts: []
    };

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Takipçi artışı
      const followersCount = user.followers.filter(
        followDate => followDate <= currentDate
      ).length;

      // Etkileşim
      const dayPosts = posts.filter(post => 
        post.createdAt.toISOString().split('T')[0] === dateStr
      );

      const engagement = dayPosts.reduce((acc, post) => {
        return acc + post.likes.length + post.comments.length + post.reposts.length;
      }, 0);

      trend.followers.push({ date: dateStr, count: followersCount });
      trend.engagement.push({ date: dateStr, count: engagement });
      trend.posts.push({ date: dateStr, count: dayPosts.length });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return trend;
  }

  // İçerik performans analizi
  static async getContentPerformance(postId) {
    const post = await Post.findById(postId)
      .populate('user', 'followers')
      .populate('categories');

    const engagementRate = post.user.followers.length > 0
      ? ((post.likes.length + post.comments.length + post.reposts.length) / post.user.followers.length) * 100
      : 0;

    const categoryAverages = await Promise.all(
      post.categories.map(async category => {
        const categoryPosts = await Post.find({ categories: category._id });
        const avgEngagement = categoryPosts.reduce((acc, p) => {
          return acc + p.likes.length + p.comments.length + p.reposts.length;
        }, 0) / categoryPosts.length;

        return {
          category: category.name,
          averageEngagement: avgEngagement,
          comparison: avgEngagement > 0 ? (engagementRate / avgEngagement) * 100 : 0
        };
      })
    );

    return {
      engagementRate,
      categoryAverages,
      interactionBreakdown: {
        likes: post.likes.length,
        comments: post.comments.length,
        reposts: post.reposts.length
      },
      timeBasedAnalysis: await this.getTimeBasedAnalysis(post)
    };
  }

  // Zaman bazlı analiz
  static async getTimeBasedAnalysis(post) {
    const hoursSincePosting = Math.floor(
      (Date.now() - post.createdAt) / (1000 * 60 * 60)
    );

    const analysis = {
      firstHour: {
        likes: 0,
        comments: 0,
        reposts: 0
      },
      first24Hours: {
        likes: 0,
        comments: 0,
        reposts: 0
      },
      total: {
        likes: post.likes.length,
        comments: post.comments.length,
        reposts: post.reposts.length
      }
    };

    // İlk saat ve ilk 24 saat analizleri için gerekli veriler
    // Bu kısım için ek bir model veya log sistemi gerekebilir

    return {
      hoursSincePosting,
      analysis
    };
  }

  // Arama analizi
  static async trackSearch(params) {
    try {
      const {
        userId,
        query,
        filters,
        resultCount,
        selectedResult,
        duration
      } = params;

      await SearchAnalytics.create({
        user: userId,
        query,
        filters,
        resultCount,
        selectedResult,
        duration,
        timestamp: new Date()
      });

      // Popüler aramaları güncelle
      await this.updatePopularSearches(query);

      return true;
    } catch (error) {
      console.error('Arama analizi hatası:', error);
      return false;
    }
  }

  // Popüler aramaları güncelle
  static async updatePopularSearches(query) {
    const timeframe = new Date();
    timeframe.setHours(timeframe.getHours() - 24);

    await SearchAnalytics.aggregate([
      {
        $match: {
          timestamp: { $gte: timeframe },
          query: { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$query',
          count: { $sum: 1 },
          avgResultCount: { $avg: '$resultCount' },
          avgDuration: { $avg: '$duration' },
          lastSearched: { $max: '$timestamp' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 100
      }
    ]);
  }

  // Arama performans analizi
  static async analyzeSearchPerformance(timeframe = '24h') {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - getTimeframeHours(timeframe));

    const metrics = await SearchAnalytics.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalSearches: { $sum: 1 },
          avgResultCount: { $avg: '$resultCount' },
          avgDuration: { $avg: '$duration' },
          successRate: {
            $avg: {
              $cond: [
                { $gt: ['$resultCount', 0] },
                1,
                0
              ]
            }
          },
          clickThroughRate: {
            $avg: {
              $cond: [
                { $ifNull: ['$selectedResult', false] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    return metrics[0] || {
      totalSearches: 0,
      avgResultCount: 0,
      avgDuration: 0,
      successRate: 0,
      clickThroughRate: 0
    };
  }

  // Kategori bazlı arama analizi
  static async analyzeCategorySearches(timeframe = '24h') {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - getTimeframeHours(timeframe));

    return await SearchAnalytics.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
          'filters.categories': { $exists: true }
        }
      },
      {
        $unwind: '$filters.categories'
      },
      {
        $group: {
          _id: '$filters.categories',
          searchCount: { $sum: 1 },
          avgResultCount: { $avg: '$resultCount' },
          successRate: {
            $avg: {
              $cond: [
                { $gt: ['$resultCount', 0] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: '$category'
      },
      {
        $sort: { searchCount: -1 }
      }
    ]);
  }

  // Kullanıcı arama davranışı analizi
  static async analyzeUserSearchBehavior(userId, timeframe = '30d') {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - getTimeframeHours(timeframe));

    const searches = await SearchAnalytics.find({
      user: userId,
      timestamp: { $gte: startDate }
    }).sort('-timestamp');

    const categoryCounts = {};
    const tagCounts = {};
    let totalDuration = 0;
    let totalResults = 0;

    searches.forEach(search => {
      totalDuration += search.duration || 0;
      totalResults += search.resultCount || 0;

      // Kategori analizi
      if (search.filters?.categories) {
        search.filters.categories.forEach(category => {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
      }

      // Etiket analizi
      if (search.filters?.tags) {
        search.filters.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    return {
      totalSearches: searches.length,
      avgDuration: searches.length ? totalDuration / searches.length : 0,
      avgResults: searches.length ? totalResults / searches.length : 0,
      topCategories: Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      topTags: Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      recentSearches: searches.slice(0, 10)
    };
  }

  // Arama önerisi analizi
  static async analyzeSearchSuggestions(timeframe = '7d') {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - getTimeframeHours(timeframe));

    const successfulSearches = await SearchAnalytics.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
          resultCount: { $gt: 0 },
          selectedResult: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$query',
          useCount: { $sum: 1 },
          avgResultCount: { $avg: '$resultCount' },
          categories: { $addToSet: '$filters.categories' },
          tags: { $addToSet: '$filters.tags' }
        }
      },
      {
        $sort: { useCount: -1 }
      },
      {
        $limit: 100
      }
    ]);

    return successfulSearches;
  }
}

// Yardımcı fonksiyonlar
function getTimeframeHours(timeframe) {
  const timeframes = {
    '24h': 24,
    '7d': 168,
    '30d': 720
  };
  return timeframes[timeframe] || 24;
}

module.exports = AnalyticsService; 