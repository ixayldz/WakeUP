const RecommendationService = require('../services/recommendation.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Kişiselleştirilmiş içerik önerileri
exports.getPersonalizedFeed = catchAsync(async (req, res) => {
  const { limit, offset, includeFollowing, categories } = req.query;
  
  const recommendations = await RecommendationService.getPersonalizedRecommendations(
    req.user.id,
    {
      limit: parseInt(limit),
      offset: parseInt(offset),
      includeFollowing: includeFollowing === 'true',
      categories: categories ? categories.split(',') : []
    }
  );
  
  res.status(200).json({
    status: 'success',
    data: recommendations
  });
});

// Benzer içerik önerileri
exports.getSimilarContent = catchAsync(async (req, res) => {
  const { postId } = req.params;
  const { limit } = req.query;
  
  const similarContent = await RecommendationService.getSimilarContent(
    postId,
    parseInt(limit)
  );
  
  res.status(200).json({
    status: 'success',
    data: similarContent
  });
});

// Kategori önerileri
exports.getCategoryRecommendations = catchAsync(async (req, res) => {
  const recommendedCategories = await RecommendationService.suggestCategories(
    req.user.id
  );
  
  res.status(200).json({
    status: 'success',
    data: recommendedCategories
  });
});

// İçerik üretici önerileri
exports.getCreatorRecommendations = catchAsync(async (req, res) => {
  const { limit = 10 } = req.query;
  
  const recommendationScores = await RecommendationService.calculateRecommendationScores(
    req.user.id
  );
  
  const recommendedCreators = recommendationScores.creators
    .slice(0, parseInt(limit));
  
  res.status(200).json({
    status: 'success',
    data: recommendedCreators
  });
}); 