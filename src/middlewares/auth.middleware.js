const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/user.model');

// JWT token kontrolü ve kullanıcı doğrulama
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Token'ı header veya cookie'den al
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Bu işlem için giriş yapmanız gerekiyor'
      });
    }

    // Token'ı doğrula
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Kullanıcıyı bul
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Bu token\'a sahip kullanıcı artık mevcut değil'
      });
    }

    // E-posta doğrulama kontrolü
    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        error: 'Lütfen önce e-posta adresinizi doğrulayın'
      });
    }

    // Yasaklama kontrolü
    if (user.checkBanStatus()) {
      return res.status(403).json({
        success: false,
        error: user.bannedUntil 
          ? `Hesabınız ${new Date(user.bannedUntil).toLocaleString()} tarihine kadar yasaklanmıştır` 
          : `Hesabınız kalıcı olarak yasaklanmıştır`,
        banReason: user.banReason
      });
    }

    // Kullanıcıyı request'e ekle
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Bu işlem için giriş yapmanız gerekiyor'
    });
  }
};

// Rol bazlı yetkilendirme
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Bu işlem için yetkiniz yok'
      });
    }
    next();
  };
};

// İsteğe bağlı JWT kontrolü
exports.optionalProtect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next();
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user && !user.checkBanStatus()) {
      req.user = user;
    }

    next();
  } catch (err) {
    next();
  }
}; 