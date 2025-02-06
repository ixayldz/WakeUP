const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  getReportedContent,
  removeContent,
  banUser,
  unbanUser,
  getBannedUsers
} = require('../controllers/moderator.controller');

// Tüm rotalar korumalı ve sadece moderatör/admin erişebilir
router.use(protect);
router.use(authorize('moderator', 'admin'));

// Raporlanmış içerikler
router.get('/reported', getReportedContent);

// İçerik yönetimi
router.delete('/content/:id', removeContent);

// Kullanıcı yönetimi
router.route('/users/banned')
  .get(getBannedUsers);

router.route('/users/:userId/ban')
  .post(banUser)
  .delete(unbanUser);

module.exports = router; 