const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  getPersonalizedFeed,
  getSimilarContent,
  getCategoryRecommendations,
  getCreatorRecommendations
} = require('../controllers/recommendation.controller');

// Tüm rotalar korumalı
router.use(protect);

// Kişiselleştirilmiş içerik önerileri
router.get('/feed', getPersonalizedFeed);

// Benzer içerik önerileri
router.get('/similar/:postId', getSimilarContent);

// Kategori önerileri
router.get('/categories', getCategoryRecommendations);

// İçerik üretici önerileri
router.get('/creators', getCreatorRecommendations);

module.exports = router; 