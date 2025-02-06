const Collaboration = require('../models/collaboration.model');
const Post = require('../models/post.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Kullanıcının işbirliklerini getir
exports.getMyCollaborations = catchAsync(async (req, res, next) => {
  const collaborations = await Collaboration.find({
    $or: [
      { initiator: req.user.id },
      { partner: req.user.id }
    ]
  })
    .populate('initiator', 'username name profilePhotos')
    .populate('partner', 'username name profilePhotos')
    .populate('originalContent', 'audioUrl photoUrl')
    .populate('collaborativeContent', 'audioUrl photoUrl')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    data: {
      collaborations
    }
  });
});

// İşbirliği oluştur
exports.createCollaboration = catchAsync(async (req, res, next) => {
  const { partnerId, type, title, description, originalContent, terms } = req.body;

  // Partner kontrolü
  const partner = await User.findById(partnerId);
  if (!partner) {
    return next(new AppError('Partner bulunamadı', 404));
  }

  // Orijinal içerik kontrolü
  const post = await Post.findById(originalContent);
  if (!post) {
    return next(new AppError('Orijinal içerik bulunamadı', 404));
  }

  // İşbirliği oluştur
  const collaboration = await Collaboration.create({
    initiator: req.user.id,
    partner: partnerId,
    type,
    title,
    description,
    originalContent,
    terms
  });

  // Partner'a bildirim gönder
  await Notification.create({
    recipient: partnerId,
    sender: req.user.id,
    type: 'collaboration_request',
    message: `${req.user.username} sizinle bir işbirliği yapmak istiyor: ${title}`,
    collaboration: collaboration._id
  });

  // WebSocket ile anlık bildirim
  req.io.to(partnerId).emit('collaborationRequest', {
    collaboration,
    sender: {
      id: req.user.id,
      username: req.user.username
    }
  });

  res.status(201).json({
    success: true,
    data: {
      collaboration
    }
  });
});

// İşbirliği detayı getir
exports.getCollaboration = catchAsync(async (req, res, next) => {
  const collaboration = await Collaboration.findById(req.params.id)
    .populate('initiator', 'username name profilePhotos')
    .populate('partner', 'username name profilePhotos')
    .populate('originalContent', 'audioUrl photoUrl')
    .populate('collaborativeContent', 'audioUrl photoUrl');

  if (!collaboration) {
    return next(new AppError('İşbirliği bulunamadı', 404));
  }

  // Sadece katılımcılar görebilir
  if (![collaboration.initiator.id, collaboration.partner.id].includes(req.user.id)) {
    return next(new AppError('Bu işbirliğine erişim izniniz yok', 403));
  }

  res.status(200).json({
    success: true,
    data: {
      collaboration
    }
  });
});

// İşbirliği durumunu güncelle
exports.updateCollaborationStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  
  const collaboration = await Collaboration.findById(req.params.id);

  if (!collaboration) {
    return next(new AppError('İşbirliği bulunamadı', 404));
  }

  // Sadece partner durumu güncelleyebilir
  if (collaboration.partner.toString() !== req.user.id) {
    return next(new AppError('Bu işlemi sadece partner yapabilir', 403));
  }

  collaboration.status = status;
  await collaboration.save();

  // Başlatana bildirim gönder
  await Notification.create({
    recipient: collaboration.initiator,
    sender: req.user.id,
    type: 'collaboration_update',
    message: `${req.user.username} işbirliği teklifinizi ${status === 'accepted' ? 'kabul etti' : 'reddetti'}: ${collaboration.title}`,
    collaboration: collaboration._id
  });

  // WebSocket ile anlık bildirim
  req.io.to(collaboration.initiator.toString()).emit('collaborationUpdate', {
    collaboration,
    status,
    updatedBy: {
      id: req.user.id,
      username: req.user.username
    }
  });

  res.status(200).json({
    success: true,
    data: {
      collaboration
    }
  });
});

// İşbirliği içeriği gönder
exports.submitCollaborativeContent = catchAsync(async (req, res, next) => {
  const collaboration = await Collaboration.findById(req.params.id);

  if (!collaboration) {
    return next(new AppError('İşbirliği bulunamadı', 404));
  }

  // Sadece partner içerik gönderebilir
  if (collaboration.partner.toString() !== req.user.id) {
    return next(new AppError('Bu işlemi sadece partner yapabilir', 403));
  }

  if (collaboration.status !== 'accepted') {
    return next(new AppError('İşbirliği henüz kabul edilmedi', 400));
  }

  // Yeni post oluştur
  const post = await Post.create({
    user: req.user.id,
    audioUrl: req.body.audioUrl,
    duration: req.body.duration,
    photoUrl: req.body.photoUrl
  });

  collaboration.collaborativeContent = post._id;
  collaboration.status = 'completed';
  await collaboration.save();

  // Başlatana bildirim gönder
  await Notification.create({
    recipient: collaboration.initiator,
    sender: req.user.id,
    type: 'collaboration_completed',
    message: `${req.user.username} işbirliği içeriğini gönderdi: ${collaboration.title}`,
    collaboration: collaboration._id,
    post: post._id
  });

  // WebSocket ile anlık bildirim
  req.io.to(collaboration.initiator.toString()).emit('collaborationCompleted', {
    collaboration,
    post,
    submittedBy: {
      id: req.user.id,
      username: req.user.username
    }
  });

  res.status(200).json({
    success: true,
    data: {
      collaboration,
      post
    }
  });
});

// İşbirliği mesajı gönder
exports.sendMessage = catchAsync(async (req, res, next) => {
  const { content } = req.body;
  
  const collaboration = await Collaboration.findById(req.params.id);

  if (!collaboration) {
    return next(new AppError('İşbirliği bulunamadı', 404));
  }

  // Sadece katılımcılar mesaj gönderebilir
  if (![collaboration.initiator.toString(), collaboration.partner.toString()].includes(req.user.id)) {
    return next(new AppError('Bu işbirliğine mesaj gönderme izniniz yok', 403));
  }

  collaboration.messages.push({
    sender: req.user.id,
    content
  });

  await collaboration.save();

  // Diğer katılımcıya bildirim gönder
  const recipientId = collaboration.initiator.toString() === req.user.id
    ? collaboration.partner
    : collaboration.initiator;

  await Notification.create({
    recipient: recipientId,
    sender: req.user.id,
    type: 'collaboration_message',
    message: `${req.user.username} işbirliği mesajı gönderdi: ${collaboration.title}`,
    collaboration: collaboration._id
  });

  // WebSocket ile anlık bildirim
  req.io.to(recipientId.toString()).emit('collaborationMessage', {
    collaboration: collaboration._id,
    message: {
      sender: {
        id: req.user.id,
        username: req.user.username
      },
      content,
      createdAt: new Date()
    }
  });

  res.status(200).json({
    success: true,
    data: {
      message: collaboration.messages[collaboration.messages.length - 1]
    }
  });
}); 