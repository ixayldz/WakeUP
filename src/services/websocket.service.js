const AudioStudioService = require('./audioStudio.service');
const AudioSyncService = require('./audioSync.service');

class WebSocketService {
  constructor(io) {
    this.io = io;
    this.audioStudio = new AudioStudioService(io);
    this.audioSync = new AudioSyncService(io);
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Yeni bir kullanıcı bağlandı:', socket.id);

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

      // Bağlantı koptuğunda
      socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı:', socket.id);
      });
    });
  }
}

module.exports = WebSocketService; 