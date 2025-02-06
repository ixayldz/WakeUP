const User = require('../models/user.model');

// Kullanıcı engelle/engeli kaldır
exports.toggleBlockUser = async (req, res, next) => {
  try {
    if (req.params.userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Kendinizi engelleyemezsiniz'
      });
    }

    const userToToggle = await User.findById(req.params.userId);
    if (!userToToggle) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    const isBlocked = req.user.blockedUsers.includes(req.params.userId);

    if (isBlocked) {
      // Engeli kaldır
      req.user.blockedUsers = req.user.blockedUsers.filter(
        id => id.toString() !== req.params.userId
      );
    } else {
      // Engelle
      req.user.blockedUsers.push(req.params.userId);
      
      // Takip ilişkisini kaldır
      req.user.following = req.user.following.filter(
        id => id.toString() !== req.params.userId
      );
      userToToggle.followers = userToToggle.followers.filter(
        id => id.toString() !== req.user.id
      );
    }

    await Promise.all([req.user.save(), userToToggle.save()]);

    res.status(200).json({
      success: true,
      data: {
        isBlocked: !isBlocked
      }
    });
  } catch (err) {
    next(err);
  }
};

// Engellenen kullanıcıları listele
exports.getBlockedUsers = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('blockedUsers', 'username name profilePhotos');

    res.status(200).json({
      success: true,
      data: user.blockedUsers
    });
  } catch (err) {
    next(err);
  }
};

// Profil görünürlük ayarlarını güncelle
exports.updateVisibilitySettings = async (req, res, next) => {
  try {
    const { profileVisibility, contentVisibility } = req.body;
    const user = await User.findById(req.user.id);

    if (profileVisibility) {
      user.profileVisibility = profileVisibility;
    }
    if (contentVisibility) {
      user.contentVisibility = contentVisibility;
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        profileVisibility: user.profileVisibility,
        contentVisibility: user.contentVisibility
      }
    });
  } catch (err) {
    next(err);
  }
};

// Profil istatistiklerini getir
exports.getProfileStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('statistics');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    // Profil görüntülenme sayısını artır
    if (req.params.userId !== req.user.id) {
      user.statistics.profileViews += 1;
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: user.statistics
    });
  } catch (err) {
    next(err);
  }
};

// İçerik görüntülenme sayısını artır
exports.incrementPostView = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    user.statistics.totalPostViews += 1;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        totalViews: user.statistics.totalPostViews
      }
    });
  } catch (err) {
    next(err);
  }
}; 