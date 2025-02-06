const UserProgress = require('../models/userProgress.model');
const Guide = require('../models/guide.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Kullanıcı ilerleme durumunu getir
exports.getUserProgress = catchAsync(async (req, res, next) => {
  const userProgress = await UserProgress.findOne({ user: req.user.id })
    .populate('completedGuides.guide');

  if (!userProgress) {
    return next(new AppError('İlerleme kaydı bulunamadı', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      userProgress
    }
  });
});

// İlerleme tercihlerini güncelle
exports.updatePreferences = catchAsync(async (req, res, next) => {
  const { showTips, tipFrequency } = req.body;

  let userProgress = await UserProgress.findOne({ user: req.user.id });

  if (!userProgress) {
    userProgress = await UserProgress.create({
      user: req.user.id,
      preferences: { showTips, tipFrequency }
    });
  } else {
    userProgress.preferences = {
      ...userProgress.preferences,
      showTips,
      tipFrequency
    };
    await userProgress.save();
  }

  res.status(200).json({
    success: true,
    data: {
      preferences: userProgress.preferences
    }
  });
});

// Günlük ipucu getir
exports.getDailyTip = catchAsync(async (req, res, next) => {
  const userProgress = await UserProgress.findOne({ user: req.user.id })
    .populate('completedGuides.guide');

  // Kullanıcının seviyesini belirle
  const userLevel = await determineUserLevel(req.user.id, userProgress);

  // Kullanıcının görmediği rehberleri bul
  const completedGuideIds = userProgress
    ? userProgress.completedGuides.map(g => g.guide._id)
    : [];

  // Kullanıcının seviyesine uygun rastgele bir ipucu seç
  const tip = await Guide.findOne({
    isActive: true,
    _id: { $nin: completedGuideIds },
    type: 'tip',
    $or: [
      { 'targetAudience.userLevel': userLevel },
      { 'targetAudience.userLevel': 'all' }
    ]
  }).sort('statistics.views');

  if (!tip) {
    return next(new AppError('Uygun ipucu bulunamadı', 404));
  }

  // İpucu görüntülenme sayısını artır
  tip.statistics.views += 1;
  await tip.save();

  res.status(200).json({
    success: true,
    data: {
      tip
    }
  });
});

// Özellik kullanım istatistiklerini getir
exports.getFeatureUsageStats = catchAsync(async (req, res, next) => {
  const userProgress = await UserProgress.findOne({ user: req.user.id });

  if (!userProgress) {
    return next(new AppError('İlerleme kaydı bulunamadı', 404));
  }

  // Özellik kullanım istatistiklerini hesapla
  const stats = {
    totalFeatures: 0,
    usedFeatures: 0,
    mostUsedFeature: null,
    leastUsedFeature: null,
    featureUsageByTime: {}
  };

  Object.entries(userProgress.featureUsage).forEach(([feature, data]) => {
    stats.totalFeatures++;
    if (data.used) {
      stats.usedFeatures++;
    }

    if (!stats.mostUsedFeature || data.count > userProgress.featureUsage[stats.mostUsedFeature].count) {
      stats.mostUsedFeature = feature;
    }

    if (!stats.leastUsedFeature || data.count < userProgress.featureUsage[stats.leastUsedFeature].count) {
      stats.leastUsedFeature = feature;
    }

    // Son 7 günlük kullanım analizi
    if (data.lastUsed) {
      const date = new Date(data.lastUsed).toISOString().split('T')[0];
      stats.featureUsageByTime[date] = (stats.featureUsageByTime[date] || 0) + 1;
    }
  });

  res.status(200).json({
    success: true,
    data: {
      stats,
      featureUsage: userProgress.featureUsage
    }
  });
});

// Öğrenme yolculuğu durumunu getir
exports.getLearningJourney = catchAsync(async (req, res, next) => {
  const userProgress = await UserProgress.findOne({ user: req.user.id })
    .populate('completedGuides.guide');

  if (!userProgress) {
    return next(new AppError('İlerleme kaydı bulunamadı', 404));
  }

  // Tüm rehberleri getir
  const allGuides = await Guide.find({ isActive: true })
    .sort('order');

  // Öğrenme yolculuğunu oluştur
  const journey = {
    completed: userProgress.completedGuides.length,
    total: allGuides.length,
    progress: (userProgress.completedGuides.length / allGuides.length) * 100,
    byFeature: {},
    nextRecommendations: []
  };

  // Özellik bazlı ilerleme
  allGuides.forEach(guide => {
    if (!journey.byFeature[guide.feature]) {
      journey.byFeature[guide.feature] = {
        total: 0,
        completed: 0,
        guides: []
      };
    }

    journey.byFeature[guide.feature].total++;
    journey.byFeature[guide.feature].guides.push({
      guide,
      completed: userProgress.completedGuides.some(
        g => g.guide._id.toString() === guide._id.toString()
      )
    });

    if (journey.byFeature[guide.feature].guides.slice(-1)[0].completed) {
      journey.byFeature[guide.feature].completed++;
    }
  });

  // Sonraki önerileri belirle
  const userLevel = await determineUserLevel(req.user.id, userProgress);
  const completedGuideIds = userProgress.completedGuides.map(g => g.guide._id);

  journey.nextRecommendations = await Guide.find({
    isActive: true,
    _id: { $nin: completedGuideIds },
    $or: [
      { 'targetAudience.userLevel': userLevel },
      { 'targetAudience.userLevel': 'all' }
    ]
  })
    .sort('order')
    .limit(3);

  res.status(200).json({
    success: true,
    data: {
      journey
    }
  });
});

// Kullanıcı seviyesini belirle (yardımcı fonksiyon)
async function determineUserLevel(userId, userProgress) {
  if (!userProgress) {
    return 'beginner';
  }

  const completedGuidesCount = userProgress.completedGuides.length;
  const featureUsage = userProgress.featureUsage;

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