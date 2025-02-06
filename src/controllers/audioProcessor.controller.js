const AudioProcessorService = require('../services/audioProcessor.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Ses kalitesini iyileştir
exports.enhanceAudio = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('Ses dosyası gereklidir', 400);
  }

  const enhancedBuffer = await AudioProcessorService.enhanceAudio(
    req.file.buffer
  );

  res.status(200).json({
    status: 'success',
    data: {
      audio: enhancedBuffer.toString('base64')
    }
  });
});

// Gürültü engelleme
exports.removeNoise = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('Ses dosyası gereklidir', 400);
  }

  const denoisedBuffer = await AudioProcessorService.removeNoise(
    req.file.buffer
  );

  res.status(200).json({
    status: 'success',
    data: {
      audio: denoisedBuffer.toString('base64')
    }
  });
});

// Ses sıkıştırma
exports.compressAudio = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('Ses dosyası gereklidir', 400);
  }

  const { quality } = req.query;

  const compressedBuffer = await AudioProcessorService.compressAudio(
    req.file.buffer,
    quality
  );

  res.status(200).json({
    status: 'success',
    data: {
      audio: compressedBuffer.toString('base64')
    }
  });
});

// Ses analizi
exports.analyzeAudio = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('Ses dosyası gereklidir', 400);
  }

  const analysis = await AudioProcessorService.analyzeAudio(
    req.file.buffer
  );

  res.status(200).json({
    status: 'success',
    data: analysis
  });
}); 