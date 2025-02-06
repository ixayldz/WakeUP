const Message = require('../models/message.model');
const User = require('../models/user.model');
const AWS = require('aws-sdk');

// AWS S3 yapılandırması
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Ses yükleme yardımcı fonksiyonu
const uploadToS3 = async (file) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `messages/${Date.now()}-${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read'
  };

  const data = await s3.upload(params).promise();
  return data.Location;
};

// Mesaj gönder
exports.sendMessage = async (req, res, next) => {
  try {
    const { duration } = req.body;
    const receiverId = req.params.userId;

    // Alıcı kontrolü
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        error: 'Alıcı bulunamadı'
      });
    }

    if (!req.files || !req.files.audio) {
      return res.status(400).json({
        success: false,
        error: 'Ses kaydı zorunludur'
      });
    }

    // Ses kaydını yükle
    const audioUrl = await uploadToS3(req.files.audio[0]);

    const message = await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      audioUrl,
      duration
    });

    // Socket.io ile gerçek zamanlı bildirim gönder
    req.io.to(receiverId).emit('newMessage', {
      message,
      sender: {
        id: req.user.id,
        name: req.user.name,
        username: req.user.username
      }
    });

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (err) {
    next(err);
  }
};

// Mesajları getir
exports.getMessages = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    // Karşılıklı mesajları getir
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: userId },
        { sender: userId, receiver: req.user.id }
      ]
    })
      .sort('-createdAt')
      .skip(startIndex)
      .limit(limit)
      .populate('sender', 'username name profilePhotos')
      .populate('receiver', 'username name profilePhotos');

    const total = await Message.countDocuments({
      $or: [
        { sender: req.user.id, receiver: userId },
        { sender: userId, receiver: req.user.id }
      ]
    });

    // Okunmamış mesajları okundu olarak işaretle
    await Message.updateMany(
      {
        sender: userId,
        receiver: req.user.id,
        isRead: false
      },
      {
        isRead: true
      }
    );

    res.status(200).json({
      success: true,
      data: messages,
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

// Mesaj sil
exports.deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Mesaj bulunamadı'
      });
    }

    // Mesaj sahibi kontrolü
    if (message.sender.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Bu mesajı silme yetkiniz yok'
      });
    }

    // S3'ten ses dosyasını sil
    const audioKey = message.audioUrl.split('/').pop();
    await s3.deleteObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `messages/${audioKey}`
    }).promise();

    await message.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// Mesajı sessize al
exports.muteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Mesaj bulunamadı'
      });
    }

    // Alıcı kontrolü
    if (message.receiver.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Bu mesajı sessize alma yetkiniz yok'
      });
    }

    message.isMuted = !message.isMuted;
    await message.save();

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (err) {
    next(err);
  }
};

// Sohbet listesini getir
exports.getChats = async (req, res, next) => {
  try {
    // Son mesajları grupla
    const chats = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { receiver: req.user._id }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', req.user._id] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', req.user._id] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Kullanıcı bilgilerini ekle
    const populatedChats = await User.populate(chats, {
      path: '_id',
      select: 'username name profilePhotos'
    });

    res.status(200).json({
      success: true,
      data: populatedChats
    });
  } catch (err) {
    next(err);
  }
}; 