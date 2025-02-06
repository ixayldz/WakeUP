const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { client: redisClient } = require('../utils/cache');
const ContentModerationService = require('./contentModeration.service');

class SecurityService {
  constructor() {
    this.moderationService = new ContentModerationService();
  }

  // IP tabanlı rate limiting
  createRateLimiter(options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 dakika
      max = 100, // IP başına maksimum istek
      message = 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.'
    } = options;

    return rateLimit({
      store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
      }),
      windowMs,
      max,
      message: {
        success: false,
        error: message
      }
    });
  }

  // Spam kontrolü
  async checkSpam(content, userId) {
    try {
      // Son 5 dakikadaki paylaşım sayısı
      const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
      const recentPosts = await Post.find({
        user: userId,
        createdAt: { $gte: last5Minutes }
      }).countDocuments();

      // Spam skoru hesapla
      const spamScore = await this.calculateSpamScore(content, recentPosts);

      return {
        isSpam: spamScore >= 0.7,
        score: spamScore,
        reason: this.getSpamReason(spamScore)
      };
    } catch (error) {
      console.error('Spam kontrol hatası:', error);
      throw error;
    }
  }

  // Spam skoru hesaplama
  async calculateSpamScore(content, recentPosts) {
    let score = 0;

    // Paylaşım sıklığı kontrolü (40%)
    score += (recentPosts / 5) * 0.4;

    // İçerik tekrarı kontrolü (30%)
    const duplicateScore = await this.checkContentDuplication(content);
    score += duplicateScore * 0.3;

    // Yasaklı kelime kontrolü (30%)
    const bannedWordsScore = await this.checkBannedWords(content);
    score += bannedWordsScore * 0.3;

    return Math.min(score, 1);
  }

  // İçerik tekrarı kontrolü
  async checkContentDuplication(content) {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const similarContent = await Post.find({
        createdAt: { $gte: last24Hours },
        $text: { $search: content }
      });

      return similarContent.length > 0 ? 1 : 0;
    } catch (error) {
      console.error('İçerik tekrarı kontrol hatası:', error);
      return 0;
    }
  }

  // Yasaklı kelime kontrolü
  async checkBannedWords(content) {
    try {
      const bannedWords = await this.getBannedWords();
      const contentLower = content.toLowerCase();
      
      const foundWords = bannedWords.filter(word => 
        contentLower.includes(word.toLowerCase())
      );

      return foundWords.length > 0 ? 1 : 0;
    } catch (error) {
      console.error('Yasaklı kelime kontrol hatası:', error);
      return 0;
    }
  }

  // Yasaklı kelimeleri getir (cache'li)
  async getBannedWords() {
    const cacheKey = 'banned_words';
    let bannedWords = await redisClient.get(cacheKey);

    if (!bannedWords) {
      // Veritabanından yasaklı kelimeleri al
      bannedWords = ['spam', 'reklam', 'kazanç', ...defaultBannedWords];
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(bannedWords));
    } else {
      bannedWords = JSON.parse(bannedWords);
    }

    return bannedWords;
  }

  // Spam nedeni
  getSpamReason(score) {
    if (score >= 0.9) return 'Çok yüksek spam riski';
    if (score >= 0.7) return 'Yüksek spam riski';
    if (score >= 0.5) return 'Orta spam riski';
    return 'Düşük spam riski';
  }

  // IP güvenlik kontrolü
  async checkIPSecurity(ip) {
    try {
      // IP kara liste kontrolü
      const isBlacklisted = await this.checkIPBlacklist(ip);
      if (isBlacklisted) {
        return {
          safe: false,
          reason: 'IP kara listede'
        };
      }

      // IP davranış analizi
      const behavior = await this.analyzeIPBehavior(ip);
      if (behavior.suspicious) {
        return {
          safe: false,
          reason: behavior.reason
        };
      }

      return {
        safe: true
      };
    } catch (error) {
      console.error('IP güvenlik kontrolü hatası:', error);
      throw error;
    }
  }

  // IP kara liste kontrolü
  async checkIPBlacklist(ip) {
    const cacheKey = `ip_blacklist:${ip}`;
    let isBlacklisted = await redisClient.get(cacheKey);

    if (isBlacklisted === null) {
      // Veritabanı kontrolü
      isBlacklisted = false; // IP kara liste veritabanı kontrolü
      await redisClient.setEx(cacheKey, 3600, isBlacklisted);
    }

    return isBlacklisted === 'true';
  }

  // IP davranış analizi
  async analyzeIPBehavior(ip) {
    const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
    
    // Son 5 dakikadaki istek sayısı
    const requestCount = await this.getIPRequestCount(ip, last5Minutes);
    
    // Şüpheli davranış kontrolü
    if (requestCount > 1000) {
      return {
        suspicious: true,
        reason: 'Çok fazla istek'
      };
    }

    return {
      suspicious: false
    };
  }

  // IP istek sayısı
  async getIPRequestCount(ip, since) {
    const cacheKey = `ip_requests:${ip}`;
    let count = await redisClient.get(cacheKey);

    return parseInt(count || '0');
  }
}

module.exports = new SecurityService(); 