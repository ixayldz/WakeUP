const Guide = require('../models/guide.model');
const UserProgress = require('../models/userProgress.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Tüm rehberleri getir
exports.getAllGuides = catchAsync(async (req, res, next) => {
  const guides = await Guide.find({ isActive: true })
    .sort('order');

  res.status(200).json({
    success: true,
    data: {
      guides
    }
  });
});

// Rehber detayı getir
exports.getGuide = catchAsync(async (req, res, next) => {
  const guide = await Guide.findById(req.params.id);

  if (!guide) {
    return next(new AppError('Rehber bulunamadı', 404));
  }

  // Görüntülenme sayısını artır
  guide.statistics.views += 1;
  await guide.save();

  res.status(200).json({
    success: true,
    data: {
      guide
    }
  });
});

// Yeni rehber oluştur (Admin)
exports.createGuide = catchAsync(async (req, res, next) => {
  const guide = await Guide.create(req.body);

  res.status(201).json({
    success: true,
    data: {
      guide
    }
  });
});

// Rehber güncelle (Admin)
exports.updateGuide = catchAsync(async (req, res, next) => {
  const guide = await Guide.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  if (!guide) {
    return next(new AppError('Rehber bulunamadı', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      guide
    }
  });
});

// Rehber sil (Admin)
exports.deleteGuide = catchAsync(async (req, res, next) => {
  const guide = await Guide.findById(req.params.id);

  if (!guide) {
    return next(new AppError('Rehber bulunamadı', 404));
  }

  guide.isActive = false;
  await guide.save();

  res.status(204).json({
    success: true,
    data: null
  });
});

// Rehber tamamlandı olarak işaretle
exports.markGuideAsCompleted = catchAsync(async (req, res, next) => {
  const { wasHelpful } = req.body;
  
  let userProgress = await UserProgress.findOne({ user: req.user.id });
  
  if (!userProgress) {
    userProgress = await UserProgress.create({
      user: req.user.id,
      completedGuides: []
    });
  }

  // Rehberin daha önce tamamlanıp tamamlanmadığını kontrol et
  const isAlreadyCompleted = userProgress.completedGuides.some(
    guide => guide.guide.toString() === req.params.id
  );

  if (!isAlreadyCompleted) {
    userProgress.completedGuides.push({
      guide: req.params.id,
      wasHelpful
    });

    // Rehber istatistiklerini güncelle
    const guide = await Guide.findById(req.params.id);
    guide.statistics.completionCount += 1;
    if (wasHelpful) {
      guide.statistics.helpfulCount += 1;
    }

    await Promise.all([userProgress.save(), guide.save()]);
  }

  res.status(200).json({
    success: true,
    data: {
      completedGuides: userProgress.completedGuides
    }
  });
});

// Kullanıcıya özel rehber önerileri
exports.getPersonalizedGuides = catchAsync(async (req, res, next) => {
  const userProgress = await UserProgress.findOne({ user: req.user.id })
    .populate('completedGuides.guide');

  // Tamamlanmamış rehberleri bul
  const completedGuideIds = userProgress
    ? userProgress.completedGuides.map(g => g.guide._id)
    : [];

  // Kullanıcının seviyesini belirle
  const userLevel = await determineUserLevel(req.user.id, userProgress);

  // Önerilen rehberleri getir
  const recommendedGuides = await Guide.find({
    isActive: true,
    _id: { $nin: completedGuideIds },
    $or: [
      { 'targetAudience.userLevel': userLevel },
      { 'targetAudience.userLevel': 'all' }
    ]
  }).sort('order');

  res.status(200).json({
    success: true,
    data: {
      userLevel,
      guides: recommendedGuides
    }
  });
});

// Kullanıcı seviyesini belirle
async function determineUserLevel(userId, userProgress) {
  if (!userProgress) {
    return 'beginner';
  }

  const completedGuidesCount = userProgress.completedGuides.length;
  const featureUsage = userProgress.featureUsage;

  // Kullanıcının özellik kullanım durumunu kontrol et
  const hasUsedBasicFeatures = featureUsage.audioRecording.used && 
    featureUsage.effects.used;
  
  const hasUsedAdvancedFeatures = featureUsage.collaboration.used && 
    featureUsage.categories.used;

  if (completedGuidesCount >= 10 && hasUsedAdvancedFeatures) {
    return 'advanced';
  } else if (completedGuidesCount >= 5 && hasUsedBasicFeatures) {
    return 'intermediate';
  }

  return 'beginner';
}

// Özellik kullanımını kaydet
exports.trackFeatureUsage = catchAsync(async (req, res, next) => {
  const { feature } = req.params;
  
  let userProgress = await UserProgress.findOne({ user: req.user.id });
  
  if (!userProgress) {
    userProgress = await UserProgress.create({
      user: req.user.id
    });
  }

  if (userProgress.featureUsage[feature]) {
    userProgress.featureUsage[feature].used = true;
    userProgress.featureUsage[feature].count += 1;
    userProgress.featureUsage[feature].lastUsed = Date.now();

    if (req.body.additionalData) {
      // Özel özellik verilerini kaydet (örn. favori efektler)
      Object.assign(userProgress.featureUsage[feature], req.body.additionalData);
    }

    await userProgress.save();
  }

  res.status(200).json({
    success: true,
    data: {
      featureUsage: userProgress.featureUsage
    }
  });
}); 