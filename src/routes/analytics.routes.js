const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// Tüm rotalar için kimlik doğrulama ve yetkilendirme gerekli
router.use(protect);
router.use(authorize('admin', 'analyst'));

// Arama analitiği rotaları
router.get('/search', analyticsController.getSearchAnalytics);
router.get('/search/categories', analyticsController.getCategorySearchAnalytics);
router.get('/search/users/:userId', analyticsController.getUserSearchAnalytics);
router.get('/search/suggestions', analyticsController.getSearchSuggestionAnalytics);
router.get('/search/popular', analyticsController.getPopularSearches);
router.get('/search/trends', analyticsController.getSearchTrends);
router.get('/search/export', analyticsController.exportSearchAnalytics);
router.get('/search/dashboard', analyticsController.getSearchDashboardMetrics);

// Diğer analitik rotaları...
router.get('/users', analyticsController.getUserAnalytics);
router.get('/content', analyticsController.getContentAnalytics);
router.get('/engagement', analyticsController.getEngagementAnalytics);
router.get('/performance', analyticsController.getPerformanceAnalytics);

module.exports = router; 