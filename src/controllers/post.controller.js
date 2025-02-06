const Post = require('../models/post.model');
const User = require('../models/user.model');
const AWS = require('aws-sdk');

// AWS S3 yapılandırması
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Ses/fotoğraf yükleme yardımcı fonksiyonu
const uploadToS3 = async (file, folder) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `${folder}/${Date.now()}-${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read'
  };

  const data = await s3.upload(params).promise();
  return data.Location;
};

// Post oluştur
exports.createPost = async (req, res, next) => {
  try {
    const { duration } = req.body;
    
    if (!req.files || !req.files.audio) {
      return res.status(400).json({
        success: false,
        error: 'Ses kaydı zorunludur'
      });
    }

    // Ses kaydını yükle
    const audioUrl = await uploadToS3(req.files.audio[0], 'audio');

    // Fotoğraf varsa yükle
    let photoUrl;
    if (req.files.photo) {
      photoUrl = await uploadToS3(req.files.photo[0], 'photos');
    }

    const post = await Post.create({
      user: req.user.id,
      audioUrl,
      duration,
      photoUrl,
      hashtags: req.body.hashtags ? req.body.hashtags.split(',').map(tag => tag.trim()) : []
    });

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

// Tüm postları getir (kişiselleştirilmiş feed)
exports.getPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const posts = await Post.find()
      .populate('user', 'username name profilePhotos')
      .sort('-createdAt')
      .skip(startIndex)
      .limit(limit);

    const total = await Post.countDocuments();

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

// Tek post getir
exports.getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username name profilePhotos')
      .populate('comments.user', 'username name profilePhotos');

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post bulunamadı'
      });
    }

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

// Post sil
exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post bulunamadı'
      });
    }

    // Post sahibi kontrolü
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Bu postu silme yetkiniz yok'
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

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// Post beğen/beğenmekten vazgeç
exports.likePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post bulunamadı'
      });
    }

    // Beğeni kontrolü
    if (post.likes.includes(req.user.id)) {
      // Beğeniyi kaldır
      post.likes = post.likes.filter(
        like => like.toString() !== req.user.id
      );
    } else {
      // Beğeni ekle
      post.likes.push(req.user.id);
    }

    await post.save();

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

// Sesli yorum ekle
exports.addComment = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post bulunamadı'
      });
    }

    if (!req.files || !req.files.audio) {
      return res.status(400).json({
        success: false,
        error: 'Ses kaydı zorunludur'
      });
    }

    // Ses kaydını yükle
    const audioUrl = await uploadToS3(req.files.audio[0], 'comments');

    post.comments.push({
      user: req.user.id,
      audioUrl,
      duration: req.body.duration
    });

    await post.save();

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

// Yorum sil
exports.deleteComment = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post bulunamadı'
      });
    }

    // Yorumu bul
    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Yorum bulunamadı'
      });
    }

    // Yorum sahibi kontrolü
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Bu yorumu silme yetkiniz yok'
      });
    }

    // S3'ten ses dosyasını sil
    const audioKey = comment.audioUrl.split('/').pop();
    await s3.deleteObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `comments/${audioKey}`
    }).promise();

    comment.remove();
    await post.save();

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

// Post paylaş
exports.repostPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post bulunamadı'
      });
    }

    // Repost kontrolü
    if (post.reposts.includes(req.user.id)) {
      // Repost'u kaldır
      post.reposts = post.reposts.filter(
        repost => repost.toString() !== req.user.id
      );
    } else {
      // Repost ekle
      post.reposts.push(req.user.id);
    }

    await post.save();

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
}; 