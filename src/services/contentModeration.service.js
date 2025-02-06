const AWS = require('aws-sdk');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

// AWS Rekognition ve Transcribe servisleri
const rekognition = new AWS.Rekognition();
const transcribe = new AWS.TranscribeService();

class ContentModerationService {
  // Fotoğraf moderasyonu
  static async moderateImage(imageBuffer) {
    try {
      const params = {
        Image: {
          Bytes: imageBuffer
        },
        MinConfidence: 60
      };

      const [labels, moderationLabels] = await Promise.all([
        rekognition.detectLabels(params).promise(),
        rekognition.detectModerationLabels(params).promise()
      ]);

      const inappropriateContent = moderationLabels.ModerationLabels.length > 0;
      const detectedLabels = labels.Labels.map(label => label.Name);

      return {
        isAppropriate: !inappropriateContent,
        labels: detectedLabels,
        moderationLabels: moderationLabels.ModerationLabels
      };
    } catch (error) {
      console.error('Image moderation error:', error);
      throw error;
    }
  }

  // Ses moderasyonu
  static async moderateAudio(audioBuffer) {
    try {
      // Geçici dosya yolları
      const tempInputPath = path.join(__dirname, `../temp/${Date.now()}-moderate-input.wav`);
      const tempOutputPath = path.join(__dirname, `../temp/${Date.now()}-moderate-output.wav`);

      // Buffer'ı geçici dosyaya yaz
      await fs.promises.writeFile(tempInputPath, audioBuffer);

      // Ses dosyasını WAV formatına dönüştür
      await new Promise((resolve, reject) => {
        ffmpeg(tempInputPath)
          .toFormat('wav')
          .on('end', resolve)
          .on('error', reject)
          .save(tempOutputPath);
      });

      // Ses dosyasını S3'e yükle
      const s3 = new AWS.S3();
      const s3Key = `temp-transcribe/${Date.now()}.wav`;
      await s3.putObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: s3Key,
        Body: await fs.promises.readFile(tempOutputPath)
      }).promise();

      // Transcribe işi başlat
      const jobName = `moderate-${Date.now()}`;
      await transcribe.startTranscriptionJob({
        TranscriptionJobName: jobName,
        LanguageCode: 'tr-TR',
        Media: {
          MediaFileUri: `s3://${process.env.AWS_BUCKET_NAME}/${s3Key}`
        },
        Settings: {
          ShowSpeakerLabels: true,
          MaxSpeakerLabels: 2
        }
      }).promise();

      // İşin tamamlanmasını bekle
      let job;
      do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        job = await transcribe.getTranscriptionJob({
          TranscriptionJobName: jobName
        }).promise();
      } while (job.TranscriptionJob.TranscriptionJobStatus === 'IN_PROGRESS');

      // Sonuçları al
      const transcriptUrl = job.TranscriptionJob.Transcript.TranscriptFileUri;
      const transcriptResponse = await fetch(transcriptUrl);
      const transcriptData = await transcriptResponse.json();

      // Geçici dosyaları temizle
      await Promise.all([
        unlinkAsync(tempInputPath),
        unlinkAsync(tempOutputPath),
        s3.deleteObject({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: s3Key
        }).promise()
      ]);

      // Yasaklı kelime kontrolü
      const transcript = transcriptData.results.transcripts[0].transcript;
      const bannedWords = ['küfür1', 'küfür2', 'hakaret1']; // Yasaklı kelime listesi
      const containsBannedWords = bannedWords.some(word => 
        transcript.toLowerCase().includes(word.toLowerCase())
      );

      return {
        isAppropriate: !containsBannedWords,
        transcript,
        containsBannedWords
      };
    } catch (error) {
      console.error('Audio moderation error:', error);
      throw error;
    }
  }

  // Spam kontrolü
  static async checkSpam(content, userId) {
    try {
      const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
      const recentPosts = await Post.find({
        user: userId,
        createdAt: { $gte: last5Minutes }
      }).countDocuments();

      const isSpam = recentPosts >= 5;

      return {
        isSpam,
        recentPosts,
        timeWindow: '5 minutes'
      };
    } catch (error) {
      console.error('Spam check error:', error);
      throw error;
    }
  }
}

module.exports = ContentModerationService; 