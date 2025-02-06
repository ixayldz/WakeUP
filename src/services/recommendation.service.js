const Post = require('../models/post.model');
const User = require('../models/user.model');
const Category = require('../models/category.model');
const AudioSearchService = require('./audioSearch.service');
const AnalyticsService = require('./analytics.service');

class RecommendationService {
  constructor() {
    this.audioSearchService = new AudioSearchService();
  }

  // Kişiselleştirilmiş içerik önerileri
  async getPersonalizedRecommendations(userId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      includeFollowing = true,
      categories = []
    } = options;

    try {
      // Kullanıcı tercihlerini ve geçmişini al
      const [
        user,
        userAnalytics,
        categoryDistribution
      ] = await Promise.all([
        User.findById(userId),
        AnalyticsService.getUserAnalytics(userId),
        AnalyticsService.getUserCategoryDistribution(userId)
      ]);

      // Öneri skorlarını hesapla
      const recommendationScores = await this.calculateRecommendationScores(
        userId,
        categoryDistribution
      );

      // İçerikleri filtrele ve sırala
      const posts = await Post.aggregate([
        {
          $match: {
            user: { 
              $ne: userId,
              ...(includeFollowing ? {} : { $nin: user.following })
            },
            ...(categories.length ? { categories: { $in: categories } } : {})
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'creator'
          }
        },
        {
          $addFields: {
            recommendationScore: {
              $sum: [
                { $multiply: ['$statistics.engagementRate', 0.4] },
                { $multiply: ['$statistics.qualityScore', 0.3] },
                { $multiply: [{ $in: ['$categories', recommendationScores.categories] }, 0.2] },
                { $multiply: [{ $in: ['$user', recommendationScores.creators] }, 0.1] }
              ]
            }
          }
        },
        {
          $sort: { recommendationScore: -1 }
        },
        {
          $skip: offset
        },
        {
          $limit: limit
        }
      ]);

      return posts;
    } catch (error) {
      console.error('Öneri hesaplama hatası:', error);
      throw error;
    }
  }

  // Öneri skorlarını hesapla
  async calculateRecommendationScores(userId, categoryDistribution) {
    try {
      // Kullanıcının en çok etkileşimde bulunduğu içerik üreticileri
      const topCreators = await Post.aggregate([
        {
          $match: {
            'likes': userId,
            'comments.user': userId,
            'reposts': userId
          }
        },
        {
          $group: {
            _id: '$user',
            interactionCount: { $sum: 1 }
          }
        },
        {
          $sort: { interactionCount: -1 }
        },
        {
          $limit: 10
        }
      ]);

      // Kategori skorları
      const categoryScores = Object.entries(categoryDistribution)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([categoryId]) => categoryId);

      return {
        creators: topCreators.map(creator => creator._id),
        categories: categoryScores
      };
    } catch (error) {
      console.error('Skor hesaplama hatası:', error);
      throw error;
    }
  }

  // Benzer ses içerikleri
  async getSimilarContent(postId, limit = 10) {
    try {
      const post = await Post.findById(postId);
      if (!post) throw new Error('İçerik bulunamadı');

      const similarPosts = await this.audioSearchService.findSimilarAudio(
        post.audioUrl,
        { limit }
      );

      return similarPosts;
    } catch (error) {
      console.error('Benzer içerik bulma hatası:', error);
      throw error;
    }
  }

  // Kategori önerileri
  async suggestCategories(userId) {
    try {
      const user = await User.findById(userId);
      
      // Kullanıcının mevcut kategorileri
      const userCategories = new Set(user.followedCategories);

      // Benzer kullanıcıların takip ettiği kategoriler
      const similarUsersCategories = await Category.aggregate([
        {
          $match: {
            followers: { $in: user.following }
          }
        },
        {
          $project: {
            _id: 1,
            name: 1,
            followerCount: { $size: '$followers' },
            commonFollowers: {
              $size: {
                $setIntersection: ['$followers', user.following]
              }
            }
          }
        },
        {
          $match: {
            _id: { $nin: Array.from(userCategories) }
          }
        },
        {
          $sort: {
            commonFollowers: -1,
            followerCount: -1
          }
        },
        {
          $limit: 5
        }
      ]);

      return similarUsersCategories;
    } catch (error) {
      console.error('Kategori önerisi hatası:', error);
      throw error;
    }
  }
}

module.exports = new RecommendationService(); 