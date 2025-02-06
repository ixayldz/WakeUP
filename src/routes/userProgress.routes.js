const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  getUserProgress,
  updatePreferences,
  getDailyTip,
  getFeatureUsageStats,
  getLearningJourney
} = require('../controllers/userProgress.controller');

// Tüm rotalar korumalı
router.use(protect);

// İlerleme durumu
router.get('/', getUserProgress);
router.put('/preferences', updatePreferences);

// İpuçları
router.get('/daily-tip', getDailyTip);

// İstatistikler
router.get('/feature-stats', getFeatureUsageStats);
router.get('/learning-journey', getLearningJourney);

module.exports = router; 