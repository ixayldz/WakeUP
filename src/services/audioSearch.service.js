const AWS = require('aws-sdk');
const Post = require('../models/post.model');
const AudioPreset = require('../models/audioPreset.model');
const Category = require('../models/category.model');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

class AudioSearchService {
  constructor() {
    this.transcribe = new AWS.TranscribeService();
    this.comprehend = new AWS.Comprehend();
    this.rekognition = new AWS.Rekognition();
  }

  // Ses içeriğini metne çevir
  async transcribeAudio(audioUrl) {
    const jobName = `search-${Date.now()}`;
    
    try {
      const transcribeParams = {
        TranscriptionJobName: jobName,
        LanguageCode: 'tr-TR',
        Media: { MediaFileUri: audioUrl }
      };

      await this.transcribe.startTranscriptionJob(transcribeParams).promise();

      let transcriptionJob;
      do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        transcriptionJob = await this.transcribe.getTranscriptionJob({
          TranscriptionJobName: jobName
        }).promise();
      } while (transcriptionJob.TranscriptionJob.TranscriptionJobStatus === 'IN_PROGRESS');

      if (transcriptionJob.TranscriptionJob.TranscriptionJobStatus === 'COMPLETED') {
        const transcriptUrl = transcriptionJob.TranscriptionJob.Transcript.TranscriptFileUri;
        const response = await fetch(transcriptUrl);
        const data = await response.json();
        return data.results.transcripts[0].transcript;
      }

      throw new Error('Transcription failed');
    } catch (error) {
      console.error('Transcribe error:', error);
      throw error;
    }
  }

  // Ses özelliklerini çıkar
  async extractAudioFeatures(audioBuffer) {
    try {
      const tempPath = path.join(__dirname, `../temp/${Date.now()}-analyze.wav`);
      await fs.promises.writeFile(tempPath, audioBuffer);

      const features = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempPath, (err, metadata) => {
          if (err) reject(err);
          else resolve(metadata);
        });
      });

      await unlinkAsync(tempPath);

      return {
        duration: features.format.duration,
        bitrate: features.format.bit_rate,
        channels: features.streams[0].channels,
        sampleRate: features.streams[0].sample_rate,
        format: features.format.format_name
      };
    } catch (error) {
      console.error('Feature extraction error:', error);
      throw error;
    }
  }

  // Ses istatistiklerini analiz et
  parseAudioStats(data) {
    return {
      avgAmplitude: data.mean,
      peakAmplitude: data.max,
      lowAmplitude: data.min,
      variance: data.variance,
      tempo: data.tempo,
      pitch: data.pitch
    };
  }

  // Benzerlik analizi
  async analyzeSimilarity(sourceAudio, targetAudio) {
    try {
      const [sourceFeatures, targetFeatures] = await Promise.all([
        this.extractAudioFeatures(sourceAudio),
        this.extractAudioFeatures(targetAudio)
      ]);

      const featureSimilarity = this.calculateFeatureSimilarity(sourceFeatures, targetFeatures);
      const textSimilarity = await this.analyzeTextSimilarity(sourceAudio, targetAudio);

      return {
        featureSimilarity,
        textSimilarity,
        totalSimilarity: (featureSimilarity + textSimilarity) / 2
      };
    } catch (error) {
      console.error('Similarity analysis error:', error);
      throw error;
    }
  }

  // Özellik benzerliği hesapla
  calculateFeatureSimilarity(source, target) {
    const weights = {
      duration: 0.3,
      bitrate: 0.2,
      channels: 0.2,
      sampleRate: 0.3
    };

    let similarity = 0;
    for (const [feature, weight] of Object.entries(weights)) {
      const diff = Math.abs(source[feature] - target[feature]);
      const max = Math.max(source[feature], target[feature]);
      similarity += weight * (1 - diff / max);
    }

    return similarity;
  }

  // Metin benzerliği analizi
  async analyzeTextSimilarity(sourceAudio, targetAudio) {
    try {
      const [sourceText, targetText] = await Promise.all([
        this.transcribeAudio(sourceAudio),
        this.transcribeAudio(targetAudio)
      ]);

      const params = {
        Text1: sourceText,
        Text2: targetText
      };

      const result = await this.comprehend.detectSyntax(params).promise();
      return result.SimilarityScore;
    } catch (error) {
      console.error('Text similarity analysis error:', error);
      return 0;
    }
  }

  // Trend analizi
  async analyzeTrends(options = {}) {
    const {
      timeframe = '24h',
      limit = 10,
      category = null
    } = options;

    try {
      const query = {
        createdAt: {
          $gte: new Date(Date.now() - this.getTimeframeMs(timeframe))
        }
      };

      if (category) {
        query.categories = category;
      }

      const posts = await Post.aggregate([
        { $match: query },
        {
          $addFields: {
            score: {
              $add: [
                { $multiply: [{ $size: '$likes' }, 2] },
                { $multiply: [{ $size: '$comments' }, 3] },
                { $multiply: [{ $size: '$reposts' }, 4] }
              ]
            }
          }
        },
        { $sort: { score: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' }
      ]);

      return posts.map(post => ({
        ...post,
        trendScore: post.score,
        engagement: {
          likes: post.likes.length,
          comments: post.comments.length,
          reposts: post.reposts.length
        }
      }));
    } catch (error) {
      console.error('Trend analysis error:', error);
      throw error;
    }
  }

  // Ses arama
  async searchAudio(options = {}) {
    const {
      query,
      filters = {},
      page = 1,
      limit = 20
    } = options;

    try {
      const searchQuery = {
        $or: [
          { 'transcription': { $regex: query, $options: 'i' } },
          { 'tags': { $in: query.split(' ') } }
        ]
      };

      if (filters.duration) {
        searchQuery.duration = {
          $gte: filters.duration.min || 0,
          $lte: filters.duration.max || 20
        };
      }

      if (filters.categories?.length) {
        searchQuery.categories = { $in: filters.categories };
      }

      const [results, total] = await Promise.all([
        Post.find(searchQuery)
          .sort('-createdAt')
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('user', 'username name avatar')
          .populate('categories', 'name'),
        Post.countDocuments(searchQuery)
      ]);

      return {
        results,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Audio search error:', error);
      throw error;
    }
  }

  // Yardımcı fonksiyonlar
  getTimeframeMs(timeframe) {
    const units = {
      h: 3600000,
      d: 86400000,
      w: 604800000,
      m: 2592000000
    };

    const value = parseInt(timeframe);
    const unit = timeframe.slice(-1);

    return value * (units[unit] || units.h);
  }

  async getAudioBuffer(url) {
    const response = await fetch(url);
    return Buffer.from(await response.arrayBuffer());
  }

  // Benzer ses içeriği bul
  async findSimilarAudio(audioUrl, options = {}) {
    const {
      limit = 10,
      minSimilarity = 0.7
    } = options;

    try {
      const sourceBuffer = await this.getAudioBuffer(audioUrl);
      const sourceFeatures = await this.extractAudioFeatures(sourceBuffer);

      const posts = await Post.find().limit(100);
      const similarities = await Promise.all(
        posts.map(async post => {
          const targetBuffer = await this.getAudioBuffer(post.audioUrl);
          const similarity = await this.analyzeSimilarity(sourceBuffer, targetBuffer);
          return {
            post,
            similarity: similarity.totalSimilarity
          };
        })
      );

      return similarities
        .filter(item => item.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => ({
          ...item.post.toObject(),
          similarityScore: item.similarity
        }));
    } catch (error) {
      console.error('Similar audio search error:', error);
      throw error;
    }
  }

  // Efekt önerileri
  async suggestEffects(audioBuffer) {
    try {
      const features = await this.extractAudioFeatures(audioBuffer);
      const presets = await AudioPreset.find({ isPublic: true });

      const suggestions = presets.map(preset => ({
        preset,
        score: this.calculatePresetScore(features, preset)
      }));

      return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(suggestion => suggestion.preset);
    } catch (error) {
      console.error('Effect suggestion error:', error);
      throw error;
    }
  }

  // Preset puanı hesapla
  calculatePresetScore(features, preset) {
    let score = 0;

    // Ses özelliklerine göre preset uyumluluğunu hesapla
    if (features.duration < 10 && preset.effects.some(e => e.type === 'echo')) {
      score += 0.3;
    }

    if (features.bitrate > 192000 && preset.effects.some(e => e.type === 'compress')) {
      score += 0.2;
    }

    if (features.channels === 1 && preset.effects.some(e => e.type === 'stereo')) {
      score += 0.2;
    }

    // Preset kullanım istatistiklerini de değerlendir
    score += (preset.statistics.usageCount / 1000) * 0.1;
    score += (preset.statistics.rating / 5) * 0.2;

    return score;
  }
}

module.exports = AudioSearchService; 