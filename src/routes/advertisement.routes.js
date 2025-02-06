const express = require('express');
const router = express.Router();
const advertisementController = require('../controllers/advertisement.controller');
const authController = require('../controllers/auth.controller');
const { uploadMedia } = require('../middlewares/upload.middleware');

// Tüm rotalar için kimlik doğrulama gerekli
router.use(authController.protect);

// Reklamveren rotaları
router.get('/my-advertisements', advertisementController.getMyAdvertisements);

router.route('/')
  .get(advertisementController.getAllAdvertisements)
  .post(
    uploadMedia.single('media'),
    advertisementController.createAdvertisement
  );

router.route('/:id')
  .get(advertisementController.getAdvertisement)
  .patch(
    uploadMedia.single('media'),
    advertisementController.updateAdvertisement
  )
  .delete(advertisementController.deleteAdvertisement);

// Moderasyon rotaları (sadece admin)
router.patch(
  '/:id/moderate',
  authController.restrictTo('admin'),
  advertisementController.moderateAdvertisement
);

// İstatistik takip rotası
router.post(
  '/:id/track',
  advertisementController.trackAdvertisementEngagement
);

module.exports = router; 