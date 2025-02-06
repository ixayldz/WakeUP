const User = require('../models/user.model');
const Post = require('../models/post.model');
const Hashtag = require('../models/hashtag.model');
const Category = require('../models/category.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Genel arama
exports.search = async (req, res, next) => {
  try {
    const { query, type = 'all', page = 1, limit = 20 } = req.query;
    const startIndex = (page - 1) * limit;
    let results = {};

    if (type === 'all' || type === 'users') {
      const users = await User.find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { name: { $regex: query, $options: 'i' } }
        ]
      })
        .select('username name profilePhotos bio')
        .skip(startIndex)
        .limit(limit);

      const totalUsers = await User.countDocuments({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { name: { $regex: query, $options: 'i' } }
        ]
      });

      results.users = {
        data: users,
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit)
      };
    }

    if (type === 'all' || type === 'posts') {
      const posts = await Post.find({
        $or: [
          { hashtags: { $regex: query, $options: 'i' } }
        ]
      })
        .populate('user', 'username name profilePhotos')
        .skip(startIndex)
        .limit(limit);

      const totalPosts = await Post.countDocuments({
        $or: [
          { hashtags: { $regex: query, $options: 'i' } }
        ]
      });

      results.posts = {
        data: posts,
        total: totalPosts,
        pages: Math.ceil(totalPosts / limit)
      };
    }

    if (type === 'all' || type === 'hashtags') {
      const hashtags = await Hashtag.find({
        name: { $regex: query, $options: 'i' }
      })
        .sort('-postCount')
        .skip(startIndex)
        .limit(limit);

      const totalHashtags = await Hashtag.countDocuments({
        name: { $regex: query, $options: 'i' }
      });

      results.hashtags = {
        data: hashtags,
        total: totalHashtags,
        pages: Math.ceil(totalHashtags / limit)
      };
    }

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (err) {
    next(err);
  }
};

// Trend hashtag'leri getir
exports.getTrendingHashtags = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const hashtags = await Hashtag.find()
      .sort('-trendScore')
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: hashtags
    });
  } catch (err) {
    next(err);
  }
};

// Önerilen kullanıcıları getir
exports.getSuggestedUsers = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    // Kullanıcının takip ettikleri
    const following = req.user.following;

    // Kullanıcının takip etmediklerinden, en çok takipçisi olanları getir
    const suggestedUsers = await User.find({
      _id: { $nin: [...following, req.user._id] }
    })
      .select('username name profilePhotos bio followers')
      .sort('-followers')
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: suggestedUsers
    });
  } catch (err) {
    next(err);
  }
};

// Keşfet sayfası için içerik getir
exports.discover = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const startIndex = (page - 1) * limit;

    // Popüler gönderileri getir (beğeni, yorum ve repost sayısına göre)
    const posts = await Post.aggregate([
      {
        $addFields: {
          popularity: {
            $add: [
              { $size: '$likes' },
              { $size: '$comments' },
              { $size: '$reposts' }
            ]
          }
        }
      },
      { $sort: { popularity: -1, createdAt: -1 } },
      { $skip: startIndex },
      { $limit: parseInt(limit) }
    ]);

    // Kullanıcı bilgilerini ekle
    await Post.populate(posts, {
      path: 'user',
      select: 'username name profilePhotos'
    });

    const total = await Post.countDocuments();

    res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

// Hashtag'e göre gönderileri getir
exports.getPostsByHashtag = async (req, res, next) => {
  try {
    const { hashtag } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const startIndex = (page - 1) * limit;

    const posts = await Post.find({
      hashtags: hashtag.toLowerCase()
    })
      .populate('user', 'username name profilePhotos')
      .sort('-createdAt')
      .skip(startIndex)
      .limit(parseInt(limit));

    const total = await Post.countDocuments({
      hashtags: hashtag.toLowerCase()
    });

    res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

// Ses dosyalarını ara
exports.searchAudio = catchAsync(async (req, res) => {
  const { query, duration, category, tags } = req.body;
  const { page = 1, limit = 20 } = req.query;
  const startIndex = (page - 1) * limit;

  let filter = {};

  if (query) {
    filter.title = { $regex: query, $options: 'i' };
  }

  if (duration) {
    filter.duration = { $lte: duration };
  }

  if (category) {
    filter.category = category;
  }

  if (tags && tags.length > 0) {
    filter.tags = { $in: tags };
  }

  const posts = await Post.find(filter)
    .where('audioFile').exists(true)
    .populate('user', 'username name profilePhotos')
    .sort('-createdAt')
    .skip(startIndex)
    .limit(parseInt(limit));

  const total = await Post.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: posts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Trendleri getir
exports.getTrends = catchAsync(async (req, res) => {
  const trends = await Post.aggregate([
    {
      $addFields: {
        popularity: {
          $add: [
            { $size: '$likes' },
            { $size: '$comments' },
            { $multiply: [{ $size: '$reposts' }, 2] }
          ]
        }
      }
    },
    { $sort: { popularity: -1 } },
    { $limit: 10 }
  ]);

  await Post.populate(trends, {
    path: 'user',
    select: 'username name profilePhotos'
  });

  res.status(200).json({
    success: true,
    data: trends
  });
});

// Benzer içerikleri getir
exports.getSimilarContent = catchAsync(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findById(postId);
  if (!post) {
    throw new AppError('Gönderi bulunamadı', 404);
  }

  const similarPosts = await Post.find({
    _id: { $ne: postId },
    $or: [
      { category: post.category },
      { tags: { $in: post.tags } }
    ]
  })
    .populate('user', 'username name profilePhotos')
    .limit(10);

  res.status(200).json({
    success: true,
    data: similarPosts
  });
});

// Kategoriye göre keşfet
exports.discoverByCategory = catchAsync(async (req, res) => {
  const { categoryId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const startIndex = (page - 1) * limit;

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new AppError('Kategori bulunamadı', 404);
  }

  const posts = await Post.find({ category: categoryId })
    .populate('user', 'username name profilePhotos')
    .sort('-createdAt')
    .skip(startIndex)
    .limit(parseInt(limit));

  const total = await Post.countDocuments({ category: categoryId });

  res.status(200).json({
    success: true,
    data: posts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Etiketlere göre keşfet
exports.discoverByTags = catchAsync(async (req, res) => {
  const { tags } = req.query;
  const { page = 1, limit = 20 } = req.query;
  const startIndex = (page - 1) * limit;

  if (!tags) {
    throw new AppError('Etiketler gereklidir', 400);
  }

  const tagArray = tags.split(',').map(tag => tag.trim());

  const posts = await Post.find({ tags: { $in: tagArray } })
    .populate('user', 'username name profilePhotos')
    .sort('-createdAt')
    .skip(startIndex)
    .limit(parseInt(limit));

  const total = await Post.countDocuments({ tags: { $in: tagArray } });

  res.status(200).json({
    success: true,
    data: posts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Popüler etiketleri getir
exports.getPopularTags = catchAsync(async (req, res) => {
  const { limit = 20 } = req.query;

  const popularTags = await Post.aggregate([
    { $unwind: '$tags' },
    {
      $group: {
        _id: '$tags',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: parseInt(limit) }
  ]);

  res.status(200).json({
    success: true,
    data: popularTags
  });
}); 