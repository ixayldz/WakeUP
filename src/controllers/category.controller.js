const Category = require('../models/category.model');
const User = require('../models/user.model');
const Post = require('../models/post.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Tüm kategorileri getir
exports.getAllCategories = catchAsync(async (req, res, next) => {
  const categories = await Category.find({ isActive: true })
    .populate('parentCategory', 'name slug')
    .populate('subCategories', 'name slug')
    .sort('order');

  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: {
      categories
    }
  });
});

// Kategori detayı getir
exports.getCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findOne({ 
    slug: req.params.slug,
    isActive: true 
  })
    .populate('parentCategory', 'name slug')
    .populate('subCategories', 'name slug');

  if (!category) {
    return next(new AppError('Kategori bulunamadı', 404));
  }

  // İstatistikleri güncelle
  category.statistics.totalViews += 1;
  await category.save();

  res.status(200).json({
    status: 'success',
    data: {
      category
    }
  });
});

// Kategoriye ait gönderileri getir
exports.getCategoryPosts = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  const category = await Category.findOne({ 
    slug: req.params.slug,
    isActive: true 
  });

  if (!category) {
    return next(new AppError('Kategori bulunamadı', 404));
  }

  const posts = await Post.find({ categories: category._id })
    .populate('user', 'username name profilePhotos')
    .sort('-createdAt')
    .skip(startIndex)
    .limit(limit);

  const total = await Post.countDocuments({ categories: category._id });

  res.status(200).json({
    status: 'success',
    data: {
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// Kategori takip et/takibi bırak
exports.toggleFollowCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findOne({ 
    slug: req.params.slug,
    isActive: true 
  });

  if (!category) {
    return next(new AppError('Kategori bulunamadı', 404));
  }

  const user = await User.findById(req.user.id);
  const isFollowing = user.followedCategories.includes(category._id);

  if (isFollowing) {
    // Takibi bırak
    user.followedCategories = user.followedCategories.filter(
      id => id.toString() !== category._id.toString()
    );
    category.statistics.followerCount -= 1;
  } else {
    // Takip et
    user.followedCategories.push(category._id);
    category.statistics.followerCount += 1;
  }

  await Promise.all([user.save(), category.save()]);

  res.status(200).json({
    status: 'success',
    data: {
      isFollowing: !isFollowing
    }
  });
});

// Takip edilen kategorileri getir
exports.getFollowedCategories = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate('followedCategories', 'name slug icon color statistics');

  res.status(200).json({
    status: 'success',
    data: {
      categories: user.followedCategories
    }
  });
});

// Popüler kategorileri getir
exports.getPopularCategories = catchAsync(async (req, res, next) => {
  const { limit = 10 } = req.query;

  const categories = await Category.find({ isActive: true })
    .sort('-statistics.followerCount')
    .limit(parseInt(limit));

  res.status(200).json({
    status: 'success',
    data: {
      categories
    }
  });
});

// Admin: Yeni kategori oluştur
exports.createCategory = catchAsync(async (req, res, next) => {
  const category = await Category.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      category
    }
  });
});

// Admin: Kategori güncelle
exports.updateCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  if (!category) {
    return next(new AppError('Kategori bulunamadı', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      category
    }
  });
});

// Admin: Kategori sil (soft delete)
exports.deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new AppError('Kategori bulunamadı', 404));
  }

  category.isActive = false;
  await category.save();

  res.status(204).json({
    status: 'success',
    data: null
  });
}); 