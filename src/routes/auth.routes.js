const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  register,
  login,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
  updatePassword
} = require('../controllers/auth.controller');

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.put('/update-password', updatePassword);

module.exports = router; 