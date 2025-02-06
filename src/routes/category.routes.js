const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  getAllCategories,
  getCategory,
  getCategoryPosts,
  toggleFollowCategory,
  getFollowedCategories,
  getPopularCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/category.controller');

// Herkese açık rotalar
router.get('/', getAllCategories);
router.get('/popular', getPopularCategories);
router.get('/:slug', getCategory);
router.get('/:slug/posts', getCategoryPosts);

// Kimlik doğrulama gerektiren rotalar
router.use(protect);
router.get('/followed/list', getFollowedCategories);
router.post('/:slug/follow', toggleFollowCategory);

// Admin rotaları
router.use(authorize('admin'));
router.post('/', createCategory);
router.patch('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router; 