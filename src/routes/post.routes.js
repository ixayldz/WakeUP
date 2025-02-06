const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  createPost,
  getPosts,
  getPost,
  deletePost,
  likePost,
  addComment,
  deleteComment,
  repostPost
} = require('../controllers/post.controller');

// Tüm rotalar korumalı
router.use(protect);

router.route('/')
  .post(createPost)
  .get(getPosts);

router.route('/:id')
  .get(getPost)
  .delete(deletePost);

router.route('/:id/like')
  .post(likePost);

router.route('/:id/repost')
  .post(repostPost);

router.route('/:id/comments')
  .post(addComment);

router.route('/:id/comments/:commentId')
  .delete(deleteComment);

module.exports = router; 