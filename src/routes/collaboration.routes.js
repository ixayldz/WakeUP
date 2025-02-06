const express = require('express');
const router = express.Router();
const collaborationController = require('../controllers/collaboration.controller');
const authController = require('../controllers/auth.controller');

// Tüm rotalar için kimlik doğrulama gerekli
router.use(authController.protect);

// Kullanıcının kendi işbirliklerini getir
router.get('/my-collaborations', collaborationController.getMyCollaborations);

// İşbirliği oluştur
router.post('/', collaborationController.createCollaboration);

// Belirli bir işbirliğini getir
router.get('/:id', collaborationController.getCollaboration);

// İşbirliği durumunu güncelle (kabul/red)
router.patch('/:id/status', collaborationController.updateCollaborationStatus);

// İşbirliği içeriği gönder
router.post('/:id/submit-content', collaborationController.submitCollaborativeContent);

// İşbirliği mesajı gönder
router.post('/:id/messages', collaborationController.sendMessage);

module.exports = router; 