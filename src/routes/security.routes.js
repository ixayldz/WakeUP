const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  checkSpam,
  checkIPSecurity,
  checkBannedWords,
  checkDuplication
} = require('../controllers/security.controller');

// Tüm rotalar korumalı
router.use(protect);

// Spam kontrolü
router.post('/check-spam', checkSpam);

// IP güvenlik kontrolü
router.get('/check-ip', checkIPSecurity);

// Yasaklı kelime kontrolü
router.post('/check-banned-words', checkBannedWords);

// İçerik tekrarı kontrolü
router.post('/check-duplication', checkDuplication);

module.exports = router; 