const { createClient } = require('redis');
const { promisify } = require('util');

class CacheService {
  constructor() {
    try {
      this.client = createClient({
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        socket: {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT)
        }
      });

      this.client.on('error', (err) => console.error('Redis Client Error:', err));
      this.client.on('connect', () => console.log('Redis Client Connected'));

      this.client.connect().catch(err => {
        console.warn('Redis bağlantısı kurulamadı, cache devre dışı:', err.message);
        this.client = null;
      });
    } catch (err) {
      console.warn('Redis servisi başlatılamadı, cache devre dışı:', err.message);
      this.client = null;
    }
  }

  // Cache anahtarı oluştur
  generateKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    
    return `${prefix}:${sortedParams}`;
  }

  // Ses arama sonuçlarını cache'le
  async cacheAudioSearch(params, results, duration = 3600) {
    if (!this.client) return false;
    const key = this.generateKey('audio_search', params);
    return await this.set(key, results, duration);
  }

  // Cache'lenmiş ses arama sonuçlarını getir
  async getCachedAudioSearch(params) {
    if (!this.client) return null;
    const key = this.generateKey('audio_search', params);
    return await this.get(key);
  }

  // Trend analizlerini cache'le
  async cacheTrendAnalysis(params, results, duration = 300) {
    if (!this.client) return false;
    const key = this.generateKey('trends', params);
    return await this.set(key, results, duration);
  }

  // Cache'lenmiş trend analizlerini getir
  async getCachedTrendAnalysis(params) {
    if (!this.client) return null;
    const key = this.generateKey('trends', params);
    return await this.get(key);
  }

  // Benzer içerik önerilerini cache'le
  async cacheSimilarContent(postId, results, duration = 3600) {
    if (!this.client) return false;
    const key = `similar:${postId}`;
    return await this.set(key, results, duration);
  }

  // Cache'lenmiş benzer içerik önerilerini getir
  async getCachedSimilarContent(postId) {
    if (!this.client) return null;
    const key = `similar:${postId}`;
    return await this.get(key);
  }

  // Popüler etiketleri cache'le
  async cachePopularTags(timeframe, results, duration = 300) {
    if (!this.client) return false;
    const key = `popular_tags:${timeframe}`;
    return await this.set(key, results, duration);
  }

  // Cache'lenmiş popüler etiketleri getir
  async getCachedPopularTags(timeframe) {
    if (!this.client) return null;
    const key = `popular_tags:${timeframe}`;
    return await this.get(key);
  }

  // Genel cache işlemleri
  async get(key) {
    if (!this.client) return null;
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error('Cache get error:', err);
      return null;
    }
  }

  async set(key, value, duration = 3600) {
    if (!this.client) return false;
    try {
      const stringValue = JSON.stringify(value);
      await this.client.setEx(key, duration, stringValue);
      return true;
    } catch (err) {
      console.error('Cache set error:', err);
      return false;
    }
  }

  async delete(key) {
    if (!this.client) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (err) {
      console.error('Cache delete error:', err);
      return false;
    }
  }

  async clear() {
    if (!this.client) return false;
    try {
      await this.client.flushAll();
      return true;
    } catch (err) {
      console.error('Cache clear error:', err);
      return false;
    }
  }

  // Cache middleware
  cacheMiddleware(prefix, duration = 3600) {
    return async (req, res, next) => {
      if (!this.client || req.method !== 'GET') {
        return next();
      }

      const key = this.generateKey(prefix, {
        path: req.originalUrl,
        query: req.query,
        user: req.user ? req.user.id : 'anonymous'
      });

      try {
        const cachedData = await this.get(key);
        if (cachedData) {
          return res.json(cachedData);
        }

        // Response'u yakala
        const originalJson = res.json;
        res.json = function(data) {
          this.set(key, data, duration);
          originalJson.call(this, data);
        };

        next();
      } catch (err) {
        console.error('Cache middleware error:', err);
        next();
      }
    };
  }

  // Ses arama cache middleware
  audioSearchCacheMiddleware(duration = 3600) {
    return this.cacheMiddleware('audio_search', duration);
  }

  // Trend analizi cache middleware
  trendsCacheMiddleware(duration = 300) {
    return this.cacheMiddleware('trends', duration);
  }

  // Benzer içerik cache middleware
  similarContentCacheMiddleware(duration = 3600) {
    return this.cacheMiddleware('similar', duration);
  }

  // Popüler etiketler cache middleware
  popularTagsCacheMiddleware(duration = 300) {
    return this.cacheMiddleware('popular_tags', duration);
  }
}

module.exports = new CacheService(); 