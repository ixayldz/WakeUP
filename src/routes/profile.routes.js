const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  toggleBlockUser,
  getBlockedUsers,
  updateVisibilitySettings,
  getProfileStats,
  incrementPostView
} = require('../controllers/profile.controller');

// Tüm rotalar korumalı
router.use(protect);

// Engelleme işlemleri
router.route('/block/:userId')
  .post(toggleBlockUser);

router.route('/blocked')
  .get(getBlockedUsers);

// Görünürlük ayarları
router.route('/visibility')
  .put(updateVisibilitySettings);

// İstatistikler
router.route('/stats/:userId')
  .get(getProfileStats);

router.route('/stats/:userId/view')
  .post(incrementPostView);

module.exports = router; 