const ffmpeg = require('fluent-ffmpeg');
const { Readable } = require('stream');
const AppError = require('../utils/appError');

class AudioProcessorService {
  // Ses kalitesini iyileştir
  static async enhanceAudio(buffer) {
    return new Promise((resolve, reject) => {
      const inputStream = new Readable();
      inputStream.push(buffer);
      inputStream.push(null);

      const chunks = [];

      ffmpeg(inputStream)
        .audioFilters([
          'highpass=f=200',
          'lowpass=f=3000',
          'volume=1.5',
          'equalizer=f=1000:width_type=o:width=2:g=2'
        ])
        .format('mp3')
        .on('error', (err) => {
          reject(new AppError('Ses iyileştirme işlemi başarısız: ' + err.message, 500));
        })
        .on('end', () => {
          resolve(Buffer.concat(chunks));
        })
        .pipe()
        .on('data', (chunk) => {
          chunks.push(chunk);
        });
    });
  }

  // Gürültü engelleme
  static async removeNoise(buffer) {
    return new Promise((resolve, reject) => {
      const inputStream = new Readable();
      inputStream.push(buffer);
      inputStream.push(null);

      const chunks = [];

      ffmpeg(inputStream)
        .audioFilters([
          'anlmdn=s=0.3:p=0.95:r=0.9',
          'highpass=f=200',
          'lowpass=f=3000'
        ])
        .format('mp3')
        .on('error', (err) => {
          reject(new AppError('Gürültü engelleme işlemi başarısız: ' + err.message, 500));
        })
        .on('end', () => {
          resolve(Buffer.concat(chunks));
        })
        .pipe()
        .on('data', (chunk) => {
          chunks.push(chunk);
        });
    });
  }

  // Ses sıkıştırma
  static async compressAudio(buffer, quality = 'medium') {
    return new Promise((resolve, reject) => {
      const inputStream = new Readable();
      inputStream.push(buffer);
      inputStream.push(null);

      const chunks = [];
      let bitrate;

      switch (quality) {
        case 'low':
          bitrate = '64k';
          break;
        case 'medium':
          bitrate = '128k';
          break;
        case 'high':
          bitrate = '192k';
          break;
        default:
          bitrate = '128k';
      }

      ffmpeg(inputStream)
        .audioBitrate(bitrate)
        .format('mp3')
        .on('error', (err) => {
          reject(new AppError('Ses sıkıştırma işlemi başarısız: ' + err.message, 500));
        })
        .on('end', () => {
          resolve(Buffer.concat(chunks));
        })
        .pipe()
        .on('data', (chunk) => {
          chunks.push(chunk);
        });
    });
  }

  // Ses analizi
  static async analyzeAudio(buffer) {
    return new Promise((resolve, reject) => {
      const inputStream = new Readable();
      inputStream.push(buffer);
      inputStream.push(null);

      ffmpeg.ffprobe(inputStream, (err, metadata) => {
        if (err) {
          reject(new AppError('Ses analizi başarısız: ' + err.message, 500));
          return;
        }

        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        
        if (!audioStream) {
          reject(new AppError('Ses akışı bulunamadı', 400));
          return;
        }

        resolve({
          duration: metadata.format.duration,
          bitrate: metadata.format.bit_rate,
          codec: audioStream.codec_name,
          channels: audioStream.channels,
          sampleRate: audioStream.sample_rate
        });
      });
    });
  }
}

module.exports = AudioProcessorService;