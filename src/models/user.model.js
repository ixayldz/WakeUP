const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Kullanıcı adı zorunludur'],
    unique: true,
    trim: true,
    minlength: [3, 'Kullanıcı adı en az 3 karakter olmalıdır'],
    maxlength: [20, 'Kullanıcı adı en fazla 20 karakter olabilir']
  },
  email: {
    type: String,
    required: [true, 'E-posta adresi zorunludur'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Geçerli bir e-posta adresi giriniz']
  },
  password: {
    type: String,
    required: [true, 'Şifre zorunludur'],
    minlength: [6, 'Şifre en az 6 karakter olmalıdır'],
    select: false
  },
  name: {
    type: String,
    required: [true, 'İsim zorunludur'],
    trim: true,
    maxlength: [50, 'İsim en fazla 50 karakter olabilir']
  },
  bio: {
    type: String,
    maxlength: [160, 'Biyografi en fazla 160 karakter olabilir'],
    default: ''
  },
  profilePhotos: [{
    type: String,
    maxlength: 5
  }],
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: String,
  bannedUntil: Date,
  bannedAt: {
    type: Date,
    default: Date.now
  },
  followers: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  notificationSettings: {
    follow: {
      type: Boolean,
      default: true
    },
    like: {
      type: Boolean,
      default: true
    },
    comment: {
      type: Boolean,
      default: true
    },
    repost: {
      type: Boolean,
      default: true
    },
    mention: {
      type: Boolean,
      default: true
    },
    directMessage: {
      type: Boolean,
      default: true
    },
    systemNotifications: {
      type: Boolean,
      default: true
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    }
  },
  blockedUsers: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  profileVisibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  contentVisibility: {
    type: String,
    enum: ['public', 'followers', 'private'],
    default: 'public'
  },
  statistics: {
    profileViews: {
      type: Number,
      default: 0
    },
    totalPostViews: {
      type: Number,
      default: 0
    },
    totalLikes: {
      type: Number,
      default: 0
    },
    totalComments: {
      type: Number,
      default: 0
    },
    totalReposts: {
      type: Number,
      default: 0
    }
  },
  followedCategories: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Category'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Şifre hashleme
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// JWT token oluşturma
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Şifre karşılaştırma
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Şifre sıfırlama tokeni oluştur
userSchema.methods.getResetPasswordToken = function() {
  // Token oluştur
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Token'ı hashle ve kaydet
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Token süresini ayarla (1 saat)
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000;

  return resetToken;
};

// E-posta doğrulama tokeni oluştur
userSchema.methods.getEmailVerificationToken = function() {
  // Token oluştur
  const verificationToken = crypto.randomBytes(20).toString('hex');

  // Token'ı hashle ve kaydet
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  // Token süresini ayarla (24 saat)
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;

  return verificationToken;
};

// Yasaklama durumunu kontrol et
userSchema.methods.checkBanStatus = function() {
  if (!this.isBanned) return false;
  if (!this.bannedUntil) return true; // Süresiz ban
  return this.bannedUntil > Date.now(); // Süreli ban kontrolü
};

// Kullanıcı engelleme kontrolü
userSchema.methods.isBlockedBy = function(userId) {
  return this.blockedUsers.includes(userId);
};

// Profil görünürlük kontrolü
userSchema.methods.isProfileVisibleTo = function(user) {
  if (this.profileVisibility === 'public') return true;
  if (!user) return false;
  if (user._id.equals(this._id)) return true;
  return this.followers.includes(user._id);
};

// İçerik görünürlük kontrolü
userSchema.methods.isContentVisibleTo = function(user) {
  if (this.contentVisibility === 'public') return true;
  if (!user) return false;
  if (user._id.equals(this._id)) return true;
  if (this.contentVisibility === 'followers') {
    return this.followers.includes(user._id);
  }
  return false;
};

module.exports = mongoose.model('User', userSchema); 