const ffmpeg = require('fluent-ffmpeg');
const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

const s3 = new AWS.S3();

class AudioStudioService {
  constructor(io) {
    this.io = io;
    this.activeStudioSessions = new Map();
  }

  // WebSocket oturumu başlat
  initializeStudioSession(userId, sessionId) {
    this.activeStudioSessions.set(sessionId, {
      userId,
      effects: [],
      lastModified: Date.now()
    });

    // Kullanıcıya özel oda oluştur
    const room = `studio_${sessionId}`;
    this.io.to(userId).socketsJoin(room);

    return sessionId;
  }

  // Oturum güncelle ve değişiklikleri yayınla
  updateStudioSession(sessionId, effects) {
    const session = this.activeStudioSessions.get(sessionId);
    if (!session) return false;

    session.effects = effects;
    session.lastModified = Date.now();

    // Değişiklikleri odaya yayınla
    this.io.to(`studio_${sessionId}`).emit('studioUpdate', {
      sessionId,
      effects
    });

    return true;
  }

  // Oturumu sonlandır
  closeStudioSession(sessionId) {
    const session = this.activeStudioSessions.get(sessionId);
    if (!session) return false;

    // Odayı kapat
    this.io.to(`studio_${sessionId}`).socketsLeave(`studio_${sessionId}`);
    this.activeStudioSessions.delete(sessionId);

    return true;
  }

  // Ses efektleri uygula
  async applyEffects(audioBuffer, effects = [], sessionId = null) {
    const tempInputPath = path.join(__dirname, `../temp/${Date.now()}-effect-input.wav`);
    const tempOutputPath = path.join(__dirname, `../temp/${Date.now()}-effect-output.wav`);

    try {
      await fs.promises.writeFile(tempInputPath, audioBuffer);

      let command = ffmpeg(tempInputPath);

      effects.forEach(effect => {
        switch (effect.type) {
          case 'echo':
            command = command.audioFilters(`aecho=0.8:0.8:${effect.delay || 1000}:${effect.decay || 0.5}`);
            break;
          case 'reverb':
            command = command.audioFilters(`aecho=0.8:0.88:${effect.delay || 60}:${effect.decay || 0.4}`);
            break;
          case 'pitch':
            command = command.audioFilters(`asetrate=44100*${effect.value || 1.0}`);
            break;
          case 'tempo':
            command = command.audioFilters(`atempo=${effect.value || 1.0}`);
            break;
          case 'bass':
            command = command.audioFilters(`bass=g=${effect.gain || 5}`);
            break;
          case 'treble':
            command = command.audioFilters(`treble=g=${effect.gain || 5}`);
            break;
        }
      });

      // İşlem durumunu WebSocket ile bildir
      if (sessionId) {
        this.io.to(`studio_${sessionId}`).emit('processingStatus', {
          status: 'processing',
          progress: 0
        });
      }

      await new Promise((resolve, reject) => {
        command
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .on('progress', progress => {
            if (sessionId) {
              this.io.to(`studio_${sessionId}`).emit('processingStatus', {
                status: 'processing',
                progress: Math.round(progress.percent)
              });
            }
          })
          .on('end', resolve)
          .on('error', reject)
          .save(tempOutputPath);
      });

      const processedBuffer = await fs.promises.readFile(tempOutputPath);

      // İşlem tamamlandı bilgisi gönder
      if (sessionId) {
        this.io.to(`studio_${sessionId}`).emit('processingStatus', {
          status: 'completed',
          progress: 100
        });
      }

      await Promise.all([
        unlinkAsync(tempInputPath),
        unlinkAsync(tempOutputPath)
      ]);

      return processedBuffer;
    } catch (error) {
      // Hata durumunu bildir
      if (sessionId) {
        this.io.to(`studio_${sessionId}`).emit('processingStatus', {
          status: 'error',
          error: error.message
        });
      }

      try {
        await Promise.all([
          unlinkAsync(tempInputPath),
          unlinkAsync(tempOutputPath)
        ]);
      } catch (cleanupError) {
        console.error('Geçici dosyalar temizlenirken hata:', cleanupError);
      }
      throw error;
    }
  }

  // Arka plan müziği ekle
  async addBackgroundMusic(audioBuffer, musicKey, volume = 0.3, sessionId = null) {
    const tempInputPath = path.join(__dirname, `../temp/${Date.now()}-input.wav`);
    const tempMusicPath = path.join(__dirname, `../temp/${Date.now()}-music.wav`);
    const tempOutputPath = path.join(__dirname, `../temp/${Date.now()}-output.wav`);

    try {
      // Ana ses dosyasını kaydet
      await fs.promises.writeFile(tempInputPath, audioBuffer);

      // Arka plan müziğini S3'ten indir
      const musicFile = await s3.getObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `background-music/${musicKey}`
      }).promise();

      await fs.promises.writeFile(tempMusicPath, musicFile.Body);

      if (sessionId) {
        this.io.to(`studio_${sessionId}`).emit('processingStatus', {
          status: 'processing',
          stage: 'mixing'
        });
      }

      // Sesleri birleştir
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(tempInputPath)
          .input(tempMusicPath)
          .complexFilter([
            `[1:a]volume=${volume}[music]`,
            '[0:a][music]amix=inputs=2:duration=first'
          ])
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .on('progress', progress => {
            if (sessionId) {
              this.io.to(`studio_${sessionId}`).emit('processingStatus', {
                status: 'processing',
                stage: 'mixing',
                progress: Math.round(progress.percent)
              });
            }
          })
          .on('end', resolve)
          .on('error', reject)
          .save(tempOutputPath);
      });

      const processedBuffer = await fs.promises.readFile(tempOutputPath);

      if (sessionId) {
        this.io.to(`studio_${sessionId}`).emit('processingStatus', {
          status: 'completed',
          stage: 'mixing'
        });
      }

      await Promise.all([
        unlinkAsync(tempInputPath),
        unlinkAsync(tempMusicPath),
        unlinkAsync(tempOutputPath)
      ]);

      return processedBuffer;
    } catch (error) {
      if (sessionId) {
        this.io.to(`studio_${sessionId}`).emit('processingStatus', {
          status: 'error',
          stage: 'mixing',
          error: error.message
        });
      }

      try {
        await Promise.all([
          unlinkAsync(tempInputPath),
          unlinkAsync(tempMusicPath),
          unlinkAsync(tempOutputPath)
        ]);
      } catch (cleanupError) {
        console.error('Geçici dosyalar temizlenirken hata:', cleanupError);
      }
      throw error;
    }
  }

  // Ses kırpma
  async trimAudio(audioBuffer, startTime, duration, sessionId = null) {
    const tempInputPath = path.join(__dirname, `../temp/${Date.now()}-trim-input.wav`);
    const tempOutputPath = path.join(__dirname, `../temp/${Date.now()}-trim-output.wav`);

    try {
      await fs.promises.writeFile(tempInputPath, audioBuffer);

      if (sessionId) {
        this.io.to(`studio_${sessionId}`).emit('processingStatus', {
          status: 'processing',
          stage: 'trimming'
        });
      }

      await new Promise((resolve, reject) => {
        ffmpeg(tempInputPath)
          .setStartTime(startTime)
          .setDuration(duration)
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .on('progress', progress => {
            if (sessionId) {
              this.io.to(`studio_${sessionId}`).emit('processingStatus', {
                status: 'processing',
                stage: 'trimming',
                progress: Math.round(progress.percent)
              });
            }
          })
          .on('end', resolve)
          .on('error', reject)
          .save(tempOutputPath);
      });

      const processedBuffer = await fs.promises.readFile(tempOutputPath);

      if (sessionId) {
        this.io.to(`studio_${sessionId}`).emit('processingStatus', {
          status: 'completed',
          stage: 'trimming'
        });
      }

      await Promise.all([
        unlinkAsync(tempInputPath),
        unlinkAsync(tempOutputPath)
      ]);

      return processedBuffer;
    } catch (error) {
      if (sessionId) {
        this.io.to(`studio_${sessionId}`).emit('processingStatus', {
          status: 'error',
          stage: 'trimming',
          error: error.message
        });
      }

      try {
        await Promise.all([
          unlinkAsync(tempInputPath),
          unlinkAsync(tempOutputPath)
        ]);
      } catch (cleanupError) {
        console.error('Geçici dosyalar temizlenirken hata:', cleanupError);
      }
      throw error;
    }
  }

  // Sesleri birleştir
  async mergeAudios(audioBuffers, sessionId = null) {
    const tempFiles = [];
    const tempOutputPath = path.join(__dirname, `../temp/${Date.now()}-merge-output.wav`);

    try {
      // Geçici dosyaları oluştur
      for (let i = 0; i < audioBuffers.length; i++) {
        const tempPath = path.join(__dirname, `../temp/${Date.now()}-merge-${i}.wav`);
        await fs.promises.writeFile(tempPath, audioBuffers[i]);
        tempFiles.push(tempPath);
      }

      if (sessionId) {
        this.io.to(`studio_${sessionId}`).emit('processingStatus', {
          status: 'processing',
          stage: 'merging'
        });
      }

      const command = ffmpeg();
      tempFiles.forEach(file => {
        command.input(file);
      });

      // Sesleri birleştir
      await new Promise((resolve, reject) => {
        command
          .complexFilter([
            `concat=n=${tempFiles.length}:v=0:a=1[out]`,
            '[out]alimiter=level_out=2:level_in=1'
          ])
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .on('progress', progress => {
            if (sessionId) {
              this.io.to(`studio_${sessionId}`).emit('processingStatus', {
                status: 'processing',
                stage: 'merging',
                progress: Math.round(progress.percent)
              });
            }
          })
          .on('end', resolve)
          .on('error', reject)
          .save(tempOutputPath);
      });

      const processedBuffer = await fs.promises.readFile(tempOutputPath);

      if (sessionId) {
        this.io.to(`studio_${sessionId}`).emit('processingStatus', {
          status: 'completed',
          stage: 'merging'
        });
      }

      // Geçici dosyaları temizle
      await Promise.all([
        ...tempFiles.map(file => unlinkAsync(file)),
        unlinkAsync(tempOutputPath)
      ]);

      return processedBuffer;
    } catch (error) {
      if (sessionId) {
        this.io.to(`studio_${sessionId}`).emit('processingStatus', {
          status: 'error',
          stage: 'merging',
          error: error.message
        });
      }

      try {
        await Promise.all([
          ...tempFiles.map(file => unlinkAsync(file)),
          unlinkAsync(tempOutputPath)
        ]);
      } catch (cleanupError) {
        console.error('Geçici dosyalar temizlenirken hata:', cleanupError);
      }
      throw error;
    }
  }
}

module.exports = AudioStudioService; 