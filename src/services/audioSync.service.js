const AudioStudioService = require('./audioStudio.service');

class AudioSyncService {
  constructor(io) {
    this.io = io;
    this.audioStudio = new AudioStudioService(io);
    this.activeSessions = new Map();
  }

  // Senkronizasyon oturumu başlat
  initSyncSession(collaborationId, participants) {
    const sessionId = `sync_${collaborationId}_${Date.now()}`;
    
    this.activeSessions.set(sessionId, {
      collaborationId,
      participants: new Set(participants),
      state: {
        isPlaying: false,
        currentTime: 0,
        lastUpdate: Date.now()
      },
      effects: [],
      buffers: new Map()
    });

    return sessionId;
  }

  // Ses durumunu güncelle
  updateAudioState(sessionId, state) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    session.state = {
      ...session.state,
      ...state,
      lastUpdate: Date.now()
    };

    // Tüm katılımcılara yeni durumu bildir
    this.io.to(`collaboration_${session.collaborationId}`).emit('audioSync:stateUpdated', {
      sessionId,
      state: session.state
    });

    return true;
  }

  // Efekt ekle/güncelle
  async updateEffect(sessionId, effect) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    // Efekti ekle veya güncelle
    const existingIndex = session.effects.findIndex(e => e.id === effect.id);
    if (existingIndex >= 0) {
      session.effects[existingIndex] = effect;
    } else {
      session.effects.push(effect);
    }

    // Tüm ses tamponlarını yeni efektlerle işle
    for (const [userId, buffer] of session.buffers) {
      try {
        const processedBuffer = await this.audioStudio.applyEffects(
          buffer,
          session.effects,
          sessionId
        );

        // İşlenmiş sesi ilgili kullanıcıya gönder
        this.io.to(userId).emit('audioSync:bufferProcessed', {
          sessionId,
          processedBuffer
        });
      } catch (error) {
        console.error(`Ses işleme hatası (${userId}):`, error);
        this.io.to(userId).emit('audioSync:error', {
          message: 'Ses işlenirken hata oluştu',
          error: error.message
        });
      }
    }

    // Tüm katılımcılara efekt güncellemesini bildir
    this.io.to(`collaboration_${session.collaborationId}`).emit('audioSync:effectUpdated', {
      sessionId,
      effects: session.effects
    });

    return true;
  }

  // Ses tamponu ekle/güncelle
  async addBuffer(sessionId, userId, buffer) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    // Tamponu kaydet
    session.buffers.set(userId, buffer);

    // Mevcut efektleri uygula
    if (session.effects.length > 0) {
      try {
        const processedBuffer = await this.audioStudio.applyEffects(
          buffer,
          session.effects,
          sessionId
        );

        // İşlenmiş sesi tüm katılımcılara gönder
        this.io.to(`collaboration_${session.collaborationId}`).emit('audioSync:bufferAdded', {
          sessionId,
          userId,
          processedBuffer
        });
      } catch (error) {
        console.error(`Ses işleme hatası (${userId}):`, error);
        this.io.to(`collaboration_${session.collaborationId}`).emit('audioSync:error', {
          message: 'Ses işlenirken hata oluştu',
          error: error.message
        });
        return false;
      }
    } else {
      // Ham sesi tüm katılımcılara gönder
      this.io.to(`collaboration_${session.collaborationId}`).emit('audioSync:bufferAdded', {
        sessionId,
        userId,
        buffer
      });
    }

    return true;
  }

  // Ses tamponunu kaldır
  removeBuffer(sessionId, userId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    session.buffers.delete(userId);

    // Tüm katılımcılara bildir
    this.io.to(`collaboration_${session.collaborationId}`).emit('audioSync:bufferRemoved', {
      sessionId,
      userId
    });

    return true;
  }

  // Senkronizasyon oturumunu sonlandır
  endSyncSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    // Tüm katılımcılara bildir
    this.io.to(`collaboration_${session.collaborationId}`).emit('audioSync:sessionEnded', {
      sessionId
    });

    this.activeSessions.delete(sessionId);
    return true;
  }

  // Katılımcı ekle
  addParticipant(sessionId, userId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    session.participants.add(userId);

    // Yeni katılımcıya mevcut durumu gönder
    this.io.to(userId).emit('audioSync:sessionState', {
      sessionId,
      state: session.state,
      effects: session.effects,
      buffers: Array.from(session.buffers)
    });

    return true;
  }

  // Katılımcı çıkar
  removeParticipant(sessionId, userId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    session.participants.delete(userId);
    this.removeBuffer(sessionId, userId);

    // Oturumda katılımcı kalmadıysa sonlandır
    if (session.participants.size === 0) {
      this.endSyncSession(sessionId);
    }

    return true;
  }

  // Oturum durumunu getir
  getSessionState(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    return {
      collaborationId: session.collaborationId,
      participants: Array.from(session.participants),
      state: session.state,
      effects: session.effects,
      buffers: Array.from(session.buffers.keys())
    };
  }
}

module.exports = AudioSyncService; 