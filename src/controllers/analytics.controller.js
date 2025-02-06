const AnalyticsService = require('../services/analytics.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getSearchAnalytics = catchAsync(async (req, res) => {
  const { timeframe } = req.query;
  
  const metrics = await AnalyticsService.analyzeSearchPerformance(timeframe);
  
  res.status(200).json({
    status: 'success',
    data: metrics
  });
});

exports.getCategorySearchAnalytics = catchAsync(async (req, res) => {
  const { timeframe } = req.query;
  
  const categoryMetrics = await AnalyticsService.analyzeCategorySearches(timeframe);
  
  res.status(200).json({
    status: 'success',
    data: categoryMetrics
  });
});

exports.getUserSearchAnalytics = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { timeframe } = req.query;
  
  if (!userId) {
    throw new AppError('Kullanıcı ID\'si gereklidir', 400);
  }
  
  const userMetrics = await AnalyticsService.analyzeUserSearchBehavior(userId, timeframe);
  
  res.status(200).json({
    status: 'success',
    data: userMetrics
  });
});

exports.getSearchSuggestionAnalytics = catchAsync(async (req, res) => {
  const { timeframe } = req.query;
  
  const suggestions = await AnalyticsService.analyzeSearchSuggestions(timeframe);
  
  res.status(200).json({
    status: 'success',
    data: suggestions
  });
});

exports.getPopularSearches = catchAsync(async (req, res) => {
  const { timeframe } = req.query;
  
  const popularSearches = await AnalyticsService.getPopularSearches(timeframe);
  
  res.status(200).json({
    status: 'success',
    data: popularSearches
  });
});

exports.getSearchTrends = catchAsync(async (req, res) => {
  const { timeframe } = req.query;
  
  const trends = await AnalyticsService.getSearchTrends(timeframe);
  
  res.status(200).json({
    status: 'success',
    data: trends
  });
});

exports.exportSearchAnalytics = catchAsync(async (req, res) => {
  const { startDate, endDate, format = 'csv' } = req.query;
  
  if (!startDate || !endDate) {
    throw new AppError('Başlangıç ve bitiş tarihleri gereklidir', 400);
  }
  
  const data = await AnalyticsService.exportSearchAnalytics(
    new Date(startDate),
    new Date(endDate),
    format
  );
  
  const filename = `search-analytics-${startDate}-${endDate}.${format}`;
  
  res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  
  res.status(200).send(data);
});

// Dashboard için özet metrikleri
exports.getSearchDashboardMetrics = catchAsync(async (req, res) => {
  const { timeframe = '24h' } = req.query;
  
  const [
    performance,
    categoryMetrics,
    popularSearches,
    trends
  ] = await Promise.all([
    AnalyticsService.analyzeSearchPerformance(timeframe),
    AnalyticsService.analyzeCategorySearches(timeframe),
    AnalyticsService.getPopularSearches(timeframe),
    AnalyticsService.getSearchTrends(timeframe)
  ]);
  
  res.status(200).json({
    status: 'success',
    data: {
      performance,
      categoryMetrics: categoryMetrics.slice(0, 5), // Top 5 kategoriler
      popularSearches: popularSearches.slice(0, 10), // Top 10 aramalar
      trends
    }
  });
});

// Gerçek zamanlı metrikler için WebSocket endpoint'i
exports.initializeRealtimeAnalytics = (io) => {
  const analyticsNamespace = io.of('/analytics');
  
  analyticsNamespace.on('connection', (socket) => {
    console.log('Analitik dashboard bağlantısı kuruldu');
    
    // Her 5 saniyede bir gerçek zamanlı metrikleri gönder
    const updateInterval = setInterval(async () => {
      try {
        const realtimeMetrics = await AnalyticsService.getRealtimeSearchMetrics();
        socket.emit('metrics-update', realtimeMetrics);
      } catch (error) {
        console.error('Gerçek zamanlı metrik güncelleme hatası:', error);
      }
    }, 5000);
    
    socket.on('disconnect', () => {
      clearInterval(updateInterval);
      console.log('Analitik dashboard bağlantısı kesildi');
    });
  });
}; 