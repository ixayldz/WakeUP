const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  getAllGuides,
  getGuide,
  createGuide,
  updateGuide,
  deleteGuide,
  markGuideAsCompleted,
  getPersonalizedGuides,
  trackFeatureUsage
} = require('../controllers/guide.controller');

// Genel rehber rotaları
router.get('/', getAllGuides);
router.get('/:id', getGuide);

// Kimlik doğrulama gerektiren rotalar
router.use(protect);
router.get('/personalized/recommendations', getPersonalizedGuides);
router.post('/:id/complete', markGuideAsCompleted);
router.post('/track/:feature', trackFeatureUsage);

// Admin rotaları
router.use(authorize('admin'));
router.post('/', createGuide);
router.patch('/:id', updateGuide);
router.delete('/:id', deleteGuide);

module.exports = router; 