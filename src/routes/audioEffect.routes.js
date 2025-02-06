const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  previewEffect,
  createPreset,
  updatePreset,
  deletePreset,
  getPresets,
  getPreset,
  toggleFavorite,
  ratePreset
} = require('../controllers/audioEffect.controller');

// Tüm rotalar korumalı
router.use(protect);

// Efekt önizleme
router.post('/preview', previewEffect);

// Preset işlemleri
router.route('/presets')
  .get(getPresets)
  .post(createPreset);

router.route('/presets/:id')
  .get(getPreset)
  .patch(updatePreset)
  .delete(deletePreset);

// Preset etkileşimleri
router.post('/presets/:id/favorite', toggleFavorite);
router.post('/presets/:id/rate', ratePreset);

module.exports = router; 