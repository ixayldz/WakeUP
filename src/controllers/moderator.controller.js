const Post = require('../models/post.model');
const User = require('../models/user.model');
const Message = require('../models/message.model');

// Raporlanmış içerikleri listele
exports.getReportedContent = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const posts = await Post.find({ isReported: true })
      .populate('user', 'username name profilePhotos')
      .sort('-createdAt')
      .skip(startIndex)
      .limit(limit);

    const total = await Post.countDocuments({ isReported: true });

    res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

// İçeriği kaldır
exports.removeContent = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'İçerik bulunamadı'
      });
    }

    // S3'ten dosyaları sil
    const audioKey = post.audioUrl.split('/').pop();
    await s3.deleteObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `audio/${audioKey}`
    }).promise();

    if (post.photoUrl) {
      const photoKey = post.photoUrl.split('/').pop();
      await s3.deleteObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `photos/${photoKey}`
      }).promise();
    }

    await post.remove();

    // Kullanıcıya bildirim gönder
    req.io.to(post.user.toString()).emit('contentRemoved', {
      message: 'İçeriğiniz topluluk kurallarını ihlal ettiği için kaldırıldı'
    });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// Kullanıcıyı yasakla
exports.banUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    user.isBanned = true;
    user.banReason = req.body.reason;
    user.bannedUntil = req.body.duration ? Date.now() + req.body.duration : null;
    await user.save();

    // Kullanıcıya bildirim gönder
    req.io.to(user._id.toString()).emit('userBanned', {
      message: `Hesabınız ${req.body.reason} nedeniyle ${req.body.duration ? 'geçici olarak' : 'kalıcı olarak'} yasaklandı`
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// Yasaklı kullanıcıları listele
exports.getBannedUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const users = await User.find({ isBanned: true })
      .select('username name profilePhotos banReason bannedUntil')
      .sort('-bannedAt')
      .skip(startIndex)
      .limit(limit);

    const total = await User.countDocuments({ isBanned: true });

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

// Yasağı kaldır
exports.unbanUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    user.isBanned = false;
    user.banReason = undefined;
    user.bannedUntil = undefined;
    await user.save();

    // Kullanıcıya bildirim gönder
    req.io.to(user._id.toString()).emit('userUnbanned', {
      message: 'Hesabınızın yasağı kaldırıldı'
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
}; 