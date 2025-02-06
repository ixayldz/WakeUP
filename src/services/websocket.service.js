const AudioStudioService = require('./audioStudio.service');
const AudioSyncService = require('./audioSync.service');
const logger = require('../utils/logger');
const config = require('../config');

class WebSocketService {
  constructor(io) {
    this.io = io;
    this.audioStudio = new AudioStudioService(io);
    this.audioSync = new AudioSyncService(io);
    this.connectedUsers = new Map();
    this.setupErrorHandling();
    this.setupConnectionHandling();
  }

  setupErrorHandling() {
    this.io.on('error', (error) => {
      logger.error('Socket.IO hatası:', error);
    });

    this.io.engine.on('connection_error', (error) => {
      logger.error('Socket.IO bağlantı hatası:', error);
    });
  }

  setupConnectionHandling() {
    this.io.on('connection', (socket) => {
      logger.info(`Yeni socket bağlantısı: ${socket.id}`);

      // Hata yönetimi
      socket.on('error', (error) => {
        logger.error(`Socket ${socket.id} hatası:`, error);
      });

      // Kullanıcı kimlik doğrulama
      socket.on('authenticate', async (token) => {
        try {
          const user = await this.verifyToken(token);
          if (user) {
            this.addUserToRoom(socket, user._id);
            socket.emit('authenticated');
            logger.info(`Kullanıcı ${user._id} socket'e bağlandı`);
          }
        } catch (error) {
          logger.error('Socket kimlik doğrulama hatası:', error);
          socket.emit('auth_error', { message: 'Kimlik doğrulama başarısız' });
        }
      });

      // Bağlantı kesme
      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });

      // Yeniden bağlanma
      socket.on('reconnect_attempt', () => {
        logger.info(`Socket ${socket.id} yeniden bağlanmaya çalışıyor`);
      });

      // Özel mesaj dinleyicisi
      socket.on('private_message', async (data) => {
        try {
          await this.handlePrivateMessage(socket, data);
        } catch (error) {
          logger.error('Özel mesaj hatası:', error);
          socket.emit('message_error', { message: 'Mesaj gönderilemedi' });
        }
      });

      // Ses paylaşımı dinleyicisi
      socket.on('audio_share', async (data) => {
        try {
          await this.handleAudioShare(socket, data);
        } catch (error) {
          logger.error('Ses paylaşım hatası:', error);
          socket.emit('share_error', { message: 'Ses paylaşılamadı' });
        }
      });

      // İşbirliği dinleyicisi
      socket.on('collaboration', async (data) => {
        try {
          await this.handleCollaboration(socket, data);
        } catch (error) {
          logger.error('İşbirliği hatası:', error);
          socket.emit('collaboration_error', { message: 'İşbirliği başarısız' });
        }
      });

      // Kullanıcı kimliğine göre odaya katıl
      socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`Kullanıcı ${userId} kendi odasına katıldı`);
      });

      // Ses stüdyosu oturumu başlat
      socket.on('studio:initialize', async ({ userId }) => {
        const sessionId = `studio_${Date.now()}_${userId}`;
        this.audioStudio.initializeStudioSession(userId, sessionId);
        
        socket.emit('studio:initialized', { sessionId });
        console.log(`Stüdyo oturumu başlatıldı: ${sessionId}`);
      });

      // Efekt güncelleme
      socket.on('studio:updateEffects', async ({ sessionId, effects }) => {
        const updated = this.audioStudio.updateStudioSession(sessionId, effects);
        
        if (updated) {
          console.log(`Efektler güncellendi: ${sessionId}`);
        } else {
          socket.emit('studio:error', {
            message: 'Oturum bulunamadı'
          });
        }
      });

      // Önizleme isteği
      socket.on('studio:preview', async ({ sessionId, audioBuffer, effects }) => {
        try {
          const processedAudio = await this.audioStudio.applyEffects(
            audioBuffer,
            effects,
            sessionId
          );

          socket.emit('studio:previewReady', {
            sessionId,
            processedAudio
          });
        } catch (error) {
          socket.emit('studio:error', {
            message: 'Önizleme oluşturulurken hata oluştu',
            error: error.message
          });
        }
      });

      // Arka plan müziği ekleme
      socket.on('studio:addBackgroundMusic', async ({ sessionId, audioBuffer, musicKey, volume }) => {
        try {
          const processedAudio = await this.audioStudio.addBackgroundMusic(
            audioBuffer,
            musicKey,
            volume,
            sessionId
          );

          socket.emit('studio:backgroundMusicAdded', {
            sessionId,
            processedAudio
          });
        } catch (error) {
          socket.emit('studio:error', {
            message: 'Arka plan müziği eklenirken hata oluştu',
            error: error.message
          });
        }
      });

      // Ses kırpma
      socket.on('studio:trim', async ({ sessionId, audioBuffer, startTime, duration }) => {
        try {
          const processedAudio = await this.audioStudio.trimAudio(
            audioBuffer,
            startTime,
            duration,
            sessionId
          );

          socket.emit('studio:trimComplete', {
            sessionId,
            processedAudio
          });
        } catch (error) {
          socket.emit('studio:error', {
            message: 'Ses kırpılırken hata oluştu',
            error: error.message
          });
        }
      });

      // Sesleri birleştirme
      socket.on('studio:merge', async ({ sessionId, audioBuffers }) => {
        try {
          const processedAudio = await this.audioStudio.mergeAudios(
            audioBuffers,
            sessionId
          );

          socket.emit('studio:mergeComplete', {
            sessionId,
            processedAudio
          });
        } catch (error) {
          socket.emit('studio:error', {
            message: 'Sesler birleştirilirken hata oluştu',
            error: error.message
          });
        }
      });

      // Oturumu sonlandır
      socket.on('studio:close', ({ sessionId }) => {
        const closed = this.audioStudio.closeStudioSession(sessionId);
        
        if (closed) {
          socket.emit('studio:closed', { sessionId });
          console.log(`Stüdyo oturumu kapatıldı: ${sessionId}`);
        }
      });

      // İşbirliği ses senkronizasyonu olayları
      socket.on('audioSync:init', async ({ collaborationId, participants }) => {
        try {
          const sessionId = this.audioSync.initSyncSession(collaborationId, participants);
          
          // Katılımcıları odaya ekle
          participants.forEach(userId => {
            this.io.to(userId).socketsJoin(`collaboration_${collaborationId}`);
          });

          socket.emit('audioSync:initialized', { sessionId });
        } catch (error) {
          socket.emit('audioSync:error', { 
            message: 'Senkronizasyon başlatılamadı',
            error: error.message 
          });
        }
      });

      socket.on('audioSync:updateState', async ({ sessionId, state }) => {
        try {
          const success = await this.audioSync.updateAudioState(sessionId, state);
          if (!success) {
            throw new Error('Oturum bulunamadı');
          }
        } catch (error) {
          socket.emit('audioSync:error', {
            message: 'Durum güncellenemedi',
            error: error.message
          });
        }
      });

      socket.on('audioSync:updateEffect', async ({ sessionId, effect }) => {
        try {
          const success = await this.audioSync.updateEffect(sessionId, effect);
          if (!success) {
            throw new Error('Oturum bulunamadı');
          }
        } catch (error) {
          socket.emit('audioSync:error', {
            message: 'Efekt güncellenemedi',
            error: error.message
          });
        }
      });

      socket.on('audioSync:addBuffer', async ({ sessionId, userId, buffer }) => {
        try {
          const success = await this.audioSync.addBuffer(sessionId, userId, buffer);
          if (!success) {
            throw new Error('Tampon eklenemedi');
          }
        } catch (error) {
          socket.emit('audioSync:error', {
            message: 'Ses tamponu eklenemedi',
            error: error.message
          });
        }
      });

      socket.on('audioSync:removeBuffer', ({ sessionId, userId }) => {
        try {
          const success = this.audioSync.removeBuffer(sessionId, userId);
          if (!success) {
            throw new Error('Tampon kaldırılamadı');
          }
        } catch (error) {
          socket.emit('audioSync:error', {
            message: 'Ses tamponu kaldırılamadı',
            error: error.message
          });
        }
      });

      socket.on('audioSync:join', ({ sessionId, userId }) => {
        try {
          const success = this.audioSync.addParticipant(sessionId, userId);
          if (!success) {
            throw new Error('Oturuma katılınamadı');
          }
          socket.join(`collaboration_${sessionId}`);
        } catch (error) {
          socket.emit('audioSync:error', {
            message: 'Oturuma katılınamadı',
            error: error.message
          });
        }
      });

      socket.on('audioSync:leave', ({ sessionId, userId }) => {
        try {
          const success = this.audioSync.removeParticipant(sessionId, userId);
          if (!success) {
            throw new Error('Oturumdan çıkılamadı');
          }
          socket.leave(`collaboration_${sessionId}`);
        } catch (error) {
          socket.emit('audioSync:error', {
            message: 'Oturumdan çıkılamadı',
            error: error.message
          });
        }
      });

      socket.on('audioSync:end', ({ sessionId }) => {
        try {
          const success = this.audioSync.endSyncSession(sessionId);
          if (!success) {
            throw new Error('Oturum sonlandırılamadı');
          }
        } catch (error) {
          socket.emit('audioSync:error', {
            message: 'Oturum sonlandırılamadı',
            error: error.message
          });
        }
      });

      socket.on('audioSync:getState', ({ sessionId }) => {
        try {
          const state = this.audioSync.getSessionState(sessionId);
          if (!state) {
            throw new Error('Oturum durumu alınamadı');
          }
          socket.emit('audioSync:state', { state });
        } catch (error) {
          socket.emit('audioSync:error', {
            message: 'Oturum durumu alınamadı',
            error: error.message
          });
        }
      });
    });
  }

  // Kullanıcıyı odaya ekle
  addUserToRoom(socket, userId) {
    const userRoom = userId.toString();
    socket.join(userRoom);
    this.connectedUsers.set(userId, socket.id);
  }

  // Bağlantı kesme işleyicisi
  handleDisconnect(socket, reason) {
    logger.info(`Socket ${socket.id} bağlantısı kesildi:`, reason);
    
    // Kullanıcıyı bağlı kullanıcılar listesinden kaldır
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === socket.id) {
        this.connectedUsers.delete(userId);
        break;
      }
    }
  }

  // Özel mesaj işleyicisi
  async handlePrivateMessage(socket, { receiverId, message }) {
    const receiverSocketId = this.connectedUsers.get(receiverId);
    if (receiverSocketId) {
      this.io.to(receiverSocketId).emit('new_message', {
        senderId: socket.user._id,
        message
      });
    }
  }

  // Ses paylaşımı işleyicisi
  async handleAudioShare(socket, { audioData, metadata }) {
    const room = metadata.roomId || 'public';
    this.io.to(room).emit('new_audio', {
      userId: socket.user._id,
      audioData,
      metadata
    });
  }

  // İşbirliği işleyicisi
  async handleCollaboration(socket, { type, data }) {
    const room = `collab_${data.collaborationId}`;
    
    switch (type) {
      case 'join':
        socket.join(room);
        this.io.to(room).emit('user_joined', {
          userId: socket.user._id,
          timestamp: Date.now()
        });
        break;
      
      case 'leave':
        socket.leave(room);
        this.io.to(room).emit('user_left', {
          userId: socket.user._id,
          timestamp: Date.now()
        });
        break;
      
      case 'update':
        this.io.to(room).emit('collaboration_update', {
          userId: socket.user._id,
          data,
          timestamp: Date.now()
        });
        break;
    }
  }

  // Bildirim gönder
  sendNotification(userId, notification) {
    const userRoom = userId.toString();
    this.io.to(userRoom).emit('notification', notification);
  }

  // Toplu bildirim gönder
  broadcastNotification(userIds, notification) {
    userIds.forEach(userId => {
      this.sendNotification(userId, notification);
    });
  }

  // Kullanıcı bağlantı durumunu kontrol et
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  // Bağlı kullanıcı sayısını al
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }
}

module.exports = WebSocketService; 