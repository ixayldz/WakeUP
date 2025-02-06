const Advertisement = require('../models/advertisement.model');
const User = require('../models/user.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const ContentModerationService = require('../services/contentModeration.service');

const moderationService = new ContentModerationService();

exports.createAdvertisement = catchAsync(async (req, res, next) => {
  // Reklamveren olarak kullanıcıyı ekle
  req.body.advertiser = req.user.id;
  
  // Medya içeriğini kontrol et
  const mediaContent = req.file ? req.file.buffer : null;
  if (mediaContent) {
    const moderationResult = req.body.type === 'audio' 
      ? await moderationService.moderateAudio(mediaContent)
      : await moderationService.moderateImage(mediaContent);
      
    if (!moderationResult.isAppropriate) {
      return next(new AppError('Uygunsuz içerik tespit edildi', 400));
    }
  }

  const advertisement = await Advertisement.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      advertisement
    }
  });
});

exports.getAdvertisement = catchAsync(async (req, res, next) => {
  const advertisement = await Advertisement.findById(req.params.id)
    .populate('advertiser', 'name email');

  if (!advertisement) {
    return next(new AppError('Bu ID\'ye sahip reklam bulunamadı', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      advertisement
    }
  });
});

exports.updateAdvertisement = catchAsync(async (req, res, next) => {
  const advertisement = await Advertisement.findById(req.params.id);

  if (!advertisement) {
    return next(new AppError('Bu ID\'ye sahip reklam bulunamadı', 404));
  }

  // Sadece reklamveren veya admin güncelleyebilir
  if (advertisement.advertiser.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Bu işlem için yetkiniz yok', 403));
  }

  // Medya içeriği güncellenmişse tekrar kontrol et
  if (req.file) {
    const moderationResult = req.body.type === 'audio'
      ? await moderationService.moderateAudio(req.file.buffer)
      : await moderationService.moderateImage(req.file.buffer);

    if (!moderationResult.isAppropriate) {
      return next(new AppError('Uygunsuz içerik tespit edildi', 400));
    }
  }

  Object.assign(advertisement, req.body);
  await advertisement.save();

  res.status(200).json({
    status: 'success',
    data: {
      advertisement
    }
  });
});

exports.deleteAdvertisement = catchAsync(async (req, res, next) => {
  const advertisement = await Advertisement.findById(req.params.id);

  if (!advertisement) {
    return next(new AppError('Bu ID\'ye sahip reklam bulunamadı', 404));
  }

  // Sadece reklamveren veya admin silebilir
  if (advertisement.advertiser.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Bu işlem için yetkiniz yok', 403));
  }

  await advertisement.remove();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getAllAdvertisements = catchAsync(async (req, res, next) => {
  const advertisements = await Advertisement.find()
    .populate('advertiser', 'name email');

  res.status(200).json({
    status: 'success',
    results: advertisements.length,
    data: {
      advertisements
    }
  });
});

exports.getMyAdvertisements = catchAsync(async (req, res, next) => {
  const advertisements = await Advertisement.find({ advertiser: req.user.id });

  res.status(200).json({
    status: 'success',
    results: advertisements.length,
    data: {
      advertisements
    }
  });
});

exports.moderateAdvertisement = catchAsync(async (req, res, next) => {
  // Sadece admin moderasyon yapabilir
  if (req.user.role !== 'admin') {
    return next(new AppError('Bu işlem için yetkiniz yok', 403));
  }

  const advertisement = await Advertisement.findById(req.params.id);

  if (!advertisement) {
    return next(new AppError('Bu ID\'ye sahip reklam bulunamadı', 404));
  }

  advertisement.moderationStatus = req.body.moderationStatus;
  advertisement.moderationNotes = req.body.moderationNotes;
  
  // Eğer reklam onaylandıysa ve başlangıç tarihi geldiyse aktif et
  if (req.body.moderationStatus === 'approved' && 
      new Date(advertisement.startDate) <= new Date()) {
    advertisement.status = 'active';
  }

  await advertisement.save();

  res.status(200).json({
    status: 'success',
    data: {
      advertisement
    }
  });
});

exports.trackAdvertisementEngagement = catchAsync(async (req, res, next) => {
  const { type } = req.body; // view, click, engagement
  const advertisement = await Advertisement.findById(req.params.id);

  if (!advertisement) {
    return next(new AppError('Bu ID\'ye sahip reklam bulunamadı', 404));
  }

  // İstatistikleri güncelle
  advertisement.statistics[type] += 1;
  
  // Harcanan tutarı güncelle
  if (type === 'view') {
    advertisement.statistics.spent += advertisement.costPerView;
  }

  // Bütçe aşıldıysa reklamı durdur
  if (advertisement.statistics.spent >= advertisement.budget) {
    advertisement.status = 'completed';
  }

  await advertisement.save();

  res.status(200).json({
    status: 'success',
    data: {
      advertisement
    }
  });
}); 