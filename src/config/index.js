const config = {
  app: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    apiVersion: process.env.API_VERSION || 'v1'
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/wakeup',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority'
    }
  },
  redis: {
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379
    },
    retryStrategy: (times) => Math.min(times * 50, 2000)
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieExpire: parseInt(process.env.JWT_COOKIE_EXPIRE) || 7
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'eu-central-1',
    bucketName: process.env.AWS_BUCKET_NAME
  },
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
    maxAudioDuration: parseInt(process.env.MAX_AUDIO_DURATION) || 20 // saniye
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 3600 // saniye
  },
  notification: {
    cleanupInterval: parseInt(process.env.NOTIFICATION_CLEANUP_INTERVAL) || 86400, // 24 saat
    maxAge: parseInt(process.env.NOTIFICATION_MAX_AGE) || 2592000 // 30 gün
  },
  ffmpeg: {
    path: process.env.FFMPEG_PATH || '/usr/local/bin/ffmpeg',
    ffprobePath: process.env.FFPROBE_PATH || '/usr/local/bin/ffprobe',
    audioSettings: {
      bitrate: process.env.AUDIO_BITRATE || '128k',
      channels: parseInt(process.env.AUDIO_CHANNELS) || 2,
      sampleRate: parseInt(process.env.AUDIO_SAMPLE_RATE) || 44100
    }
  },
  moderation: {
    autoDelete: process.env.MODERATION_AUTO_DELETE === 'true',
    minReports: parseInt(process.env.MODERATION_MIN_REPORTS) || 5
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.LOG_FORMAT || 'combined'
  },
  storage: {
    freeLimit: parseInt(process.env.FREE_STORAGE_LIMIT) || 1073741824, // 1GB
    premiumLimit: parseInt(process.env.PREMIUM_STORAGE_LIMIT) || 53687091200 // 50GB
  },
  collaboration: {
    maxParticipants: parseInt(process.env.MAX_COLLABORATION_PARTICIPANTS) || 5,
    timeout: parseInt(process.env.COLLABORATION_TIMEOUT) || 86400 // 24 saat
  }
};

module.exports = config; 