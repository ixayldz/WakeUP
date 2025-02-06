const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

// Ses dosyası işleme
exports.processAudio = async (inputBuffer, options = {}) => {
  const {
    duration,
    volume = 1.0,
    backgroundMusic,
    effects = []
  } = options;

  // Geçici dosya yolları
  const tempInputPath = path.join(__dirname, `../temp/${Date.now()}-input.wav`);
  const tempOutputPath = path.join(__dirname, `../temp/${Date.now()}-output.wav`);

  try {
    // Buffer'ı geçici dosyaya yaz
    await fs.promises.writeFile(tempInputPath, inputBuffer);

    // FFmpeg komutu oluştur
    let command = ffmpeg(tempInputPath);

    // Süre kontrolü
    if (duration && duration > 20) {
      command = command.duration(20);
    }

    // Ses seviyesi ayarı
    if (volume !== 1.0) {
      command = command.audioFilters(`volume=${volume}`);
    }

    // Efektleri uygula
    effects.forEach(effect => {
      switch (effect) {
        case 'echo':
          command = command.audioFilters('aecho=0.8:0.9:1000:0.3');
          break;
        case 'reverb':
          command = command.audioFilters('aecho=0.8:0.88:60:0.4');
          break;
        case 'pitch':
          command = command.audioFilters('asetrate=44100*1.2');
          break;
        case 'slow':
          command = command.audioFilters('atempo=0.8');
          break;
        case 'fast':
          command = command.audioFilters('atempo=1.2');
          break;
      }
    });

    // Arka plan müziği ekle
    if (backgroundMusic) {
      command = command
        .input(backgroundMusic)
        .audioFilters('amix=inputs=2:duration=first:dropout_transition=2');
    }

    // Ses kalitesi ayarları
    command = command
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .audioChannels(2)
      .audioFrequency(44100);

    // İşlemi gerçekleştir
    await new Promise((resolve, reject) => {
      command
        .on('end', resolve)
        .on('error', reject)
        .save(tempOutputPath);
    });

    // İşlenmiş dosyayı oku
    const processedBuffer = await fs.promises.readFile(tempOutputPath);

    // Geçici dosyaları temizle
    await Promise.all([
      unlinkAsync(tempInputPath),
      unlinkAsync(tempOutputPath)
    ]);

    return processedBuffer;
  } catch (error) {
    // Hata durumunda geçici dosyaları temizle
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
};

// Ses kalitesi kontrolü
exports.validateAudio = async (buffer) => {
  try {
    const tempPath = path.join(__dirname, `../temp/${Date.now()}-validate.wav`);
    await fs.promises.writeFile(tempPath, buffer);

    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(tempPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    await unlinkAsync(tempPath);

    const { duration, bit_rate, channels, sample_rate } = metadata.streams[0];

    return {
      isValid: duration <= 20 && channels <= 2 && sample_rate >= 44100,
      duration,
      bitRate: bit_rate,
      channels,
      sampleRate: sample_rate
    };
  } catch (error) {
    throw new Error('Ses dosyası geçersiz: ' + error.message);
  }
};

// Ses dosyası boyutunu optimize et
exports.optimizeAudio = async (buffer) => {
  const tempInputPath = path.join(__dirname, `../temp/${Date.now()}-optimize-input.wav`);
  const tempOutputPath = path.join(__dirname, `../temp/${Date.now()}-optimize-output.mp3`);

  try {
    await fs.promises.writeFile(tempInputPath, buffer);

    await new Promise((resolve, reject) => {
      ffmpeg(tempInputPath)
        .audioCodec('libmp3lame')
        .audioBitrate('96k')
        .audioChannels(1)
        .audioFrequency(44100)
        .on('end', resolve)
        .on('error', reject)
        .save(tempOutputPath);
    });

    const optimizedBuffer = await fs.promises.readFile(tempOutputPath);

    await Promise.all([
      unlinkAsync(tempInputPath),
      unlinkAsync(tempOutputPath)
    ]);

    return optimizedBuffer;
  } catch (error) {
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
}; 