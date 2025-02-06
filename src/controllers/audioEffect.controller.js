const AudioPreset = require('../models/audioPreset.model');
const AudioStudioService = require('../services/audioStudio.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Efekt önizleme
exports.previewEffect = catchAsync(async (req, res, next) => {
  const { audioBuffer, effects } = req.body;
  
  if (!audioBuffer) {
    return next(new AppError('Ses dosyası gereklidir', 400));
  }

  const processedAudio = await AudioStudioService.applyEffects(audioBuffer, effects);

  res.status(200).json({
    success: true,
    data: {
      processedAudio
    }
  });
});

// Preset oluştur
exports.createPreset = catchAsync(async (req, res, next) => {
  req.body.creator = req.user.id;
  
  const preset = await AudioPreset.create(req.body);

  res.status(201).json({
    success: true,
    data: {
      preset
    }
  });
});

// Preset'i güncelle
exports.updatePreset = catchAsync(async (req, res, next) => {
  const preset = await AudioPreset.findById(req.params.id);

  if (!preset) {
    return next(new AppError('Preset bulunamadı', 404));
  }

  // Sadece oluşturan kişi veya admin güncelleyebilir
  if (preset.creator.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Bu işlem için yetkiniz yok', 403));
  }

  Object.assign(preset, req.body);
  await preset.save();

  res.status(200).json({
    success: true,
    data: {
      preset
    }
  });
});

// Preset'i sil
exports.deletePreset = catchAsync(async (req, res, next) => {
  const preset = await AudioPreset.findById(req.params.id);

  if (!preset) {
    return next(new AppError('Preset bulunamadı', 404));
  }

  // Sadece oluşturan kişi veya admin silebilir
  if (preset.creator.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Bu işlem için yetkiniz yok', 403));
  }

  await preset.remove();

  res.status(204).json({
    success: true,
    data: null
  });
});

// Preset listesi
exports.getPresets = catchAsync(async (req, res, next) => {
  const presets = await AudioPreset.find({
    $or: [
      { isPublic: true },
      { creator: req.user.id }
    ]
  }).populate('creator', 'username name');

  res.status(200).json({
    success: true,
    data: {
      presets
    }
  });
});

// Preset detayı
exports.getPreset = catchAsync(async (req, res, next) => {
  const preset = await AudioPreset.findById(req.params.id)
    .populate('creator', 'username name');

  if (!preset) {
    return next(new AppError('Preset bulunamadı', 404));
  }

  // Özel presetleri sadece sahibi görebilir
  if (!preset.isPublic && preset.creator.toString() !== req.user.id) {
    return next(new AppError('Bu preset\'e erişim izniniz yok', 403));
  }

  res.status(200).json({
    success: true,
    data: {
      preset
    }
  });
});

// Preset'i favorilere ekle/çıkar
exports.toggleFavorite = catchAsync(async (req, res, next) => {
  const preset = await AudioPreset.findById(req.params.id);

  if (!preset) {
    return next(new AppError('Preset bulunamadı', 404));
  }

  const user = await User.findById(req.user.id);
  const isFavorited = user.favoritePresets.includes(preset._id);

  if (isFavorited) {
    // Favorilerden çıkar
    user.favoritePresets = user.favoritePresets.filter(
      id => id.toString() !== preset._id.toString()
    );
    preset.statistics.favoriteCount -= 1;
  } else {
    // Favorilere ekle
    user.favoritePresets.push(preset._id);
    preset.statistics.favoriteCount += 1;
  }

  await Promise.all([user.save(), preset.save()]);

  res.status(200).json({
    success: true,
    data: {
      isFavorited: !isFavorited
    }
  });
});

// Preset'e puan ver
exports.ratePreset = catchAsync(async (req, res, next) => {
  const { rating } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return next(new AppError('Geçerli bir puan giriniz (1-5)', 400));
  }

  const preset = await AudioPreset.findById(req.params.id);

  if (!preset) {
    return next(new AppError('Preset bulunamadı', 404));
  }

  // Yeni ortalama puanı hesapla
  const newRatingCount = preset.statistics.ratingCount + 1;
  const currentTotalRating = preset.statistics.rating * preset.statistics.ratingCount;
  const newRating = (currentTotalRating + rating) / newRatingCount;

  preset.statistics.rating = newRating;
  preset.statistics.ratingCount = newRatingCount;

  await preset.save();

  res.status(200).json({
    success: true,
    data: {
      rating: preset.statistics.rating,
      ratingCount: preset.statistics.ratingCount
    }
  });
}); 