const SecurityService = require('../services/security.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Spam kontrolü
exports.checkSpam = catchAsync(async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    throw new AppError('İçerik gereklidir', 400);
  }

  const spamCheck = await SecurityService.checkSpam(content, req.user.id);

  res.status(200).json({
    status: 'success',
    data: spamCheck
  });
});

// IP güvenlik kontrolü
exports.checkIPSecurity = catchAsync(async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  const securityCheck = await SecurityService.checkIPSecurity(ip);

  res.status(200).json({
    status: 'success',
    data: securityCheck
  });
});

// Yasaklı kelime kontrolü
exports.checkBannedWords = catchAsync(async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    throw new AppError('İçerik gereklidir', 400);
  }

  const bannedWordsCheck = await SecurityService.checkBannedWords(content);

  res.status(200).json({
    status: 'success',
    data: {
      hasBannedWords: bannedWordsCheck > 0
    }
  });
});

// İçerik tekrarı kontrolü
exports.checkDuplication = catchAsync(async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    throw new AppError('İçerik gereklidir', 400);
  }

  const duplicationCheck = await SecurityService.checkContentDuplication(content);

  res.status(200).json({
    status: 'success',
    data: {
      isDuplicate: duplicationCheck > 0
    }
  });
}); 