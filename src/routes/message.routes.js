const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  sendMessage,
  getMessages,
  deleteMessage,
  muteMessage,
  getChats
} = require('../controllers/message.controller');

// Tüm rotalar korumalı
router.use(protect);

// Sohbet listesi
router.get('/chats', getChats);

// Kullanıcı ile olan mesajlar
router.route('/:userId')
  .post(sendMessage)
  .get(getMessages);

// Mesaj işlemleri
router.route('/:messageId')
  .delete(deleteMessage);

router.route('/:messageId/mute')
  .post(muteMessage);

module.exports = router; 