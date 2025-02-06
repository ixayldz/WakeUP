const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middlewares/auth.middleware');
const cacheService = require('../services/cache.service');
const {
  search,
  getTrendingHashtags,
  getSuggestedUsers,
  discover,
  getPostsByHashtag,
  searchAudio,
  getTrends,
  getSimilarContent,
  discoverByCategory,
  discoverByTags,
  getPopularTags
} = require('../controllers/search.controller');

// Genel arama ve keşfet rotaları
router.get('/search', optionalProtect, search);
router.get('/trending', getTrendingHashtags);
router.get('/discover', optionalProtect, discover);
router.get('/hashtag/:hashtag', optionalProtect, getPostsByHashtag);

// Korumalı rotalar
router.use(protect);
router.get('/suggested-users', getSuggestedUsers);

// İsteğe bağlı kimlik doğrulama
router.use(optionalProtect);

// Ses arama rotaları (POST olduğu için cache middleware kullanmıyoruz)
router.post('/audio', searchAudio);

// Cache'li rotalar
router.get(
  '/trends',
  cacheService.trendsCacheMiddleware(),
  getTrends
);

router.get(
  '/tags/popular',
  cacheService.popularTagsCacheMiddleware(),
  getPopularTags
);

router.get(
  '/similar/:postId',
  cacheService.similarContentCacheMiddleware(),
  getSimilarContent
);

router.get(
  '/discover/category/:categoryId',
  cacheService.audioSearchCacheMiddleware(),
  discoverByCategory
);

router.get(
  '/discover/tags',
  cacheService.audioSearchCacheMiddleware(),
  discoverByTags
);

module.exports = router; 