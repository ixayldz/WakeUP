const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const multer = require('multer');
const {
  enhanceAudio,
  removeNoise,
  compressAudio,
  analyzeAudio
} = require('../controllers/audioProcessor.controller');

// Multer yapılandırması
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Tüm rotalar korumalı
router.use(protect);

// Ses kalitesi iyileştirme
router.post('/enhance', upload.single('audio'), enhanceAudio);

// Gürültü engelleme
router.post('/denoise', upload.single('audio'), removeNoise);

// Ses sıkıştırma
router.post('/compress', upload.single('audio'), compressAudio);

// Ses analizi
router.post('/analyze', upload.single('audio'), analyzeAudio);

module.exports = router; 