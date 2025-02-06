const AppError = require('../utils/appError');
const config = require('../config');
const logger = require('../utils/logger');

const handleCastErrorDB = err => {
  const message = `Geçersiz ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Bu değer zaten kullanımda: ${value}. Lütfen başka bir değer deneyin.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Geçersiz veri girişi. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Geçersiz token. Lütfen tekrar giriş yapın.', 401);

const handleJWTExpiredError = () =>
  new AppError('Token süresi doldu. Lütfen tekrar giriş yapın.', 401);

const handleMulterError = err => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError(`Dosya boyutu çok büyük. Maksimum boyut: ${config.upload.maxFileSize / 1024 / 1024}MB`, 400);
  }
  return new AppError('Dosya yükleme hatası', 400);
};

const sendErrorDev = (err, req, res) => {
  logger.error('Hata:', {
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });

  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, req, res) => {
  logger.error('Hata:', {
    status: err.status,
    message: err.message
  });

  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    res.status(500).json({
      status: 'error',
      message: 'Bir şeyler yanlış gitti!'
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (config.app.env === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.name === 'MulterError') error = handleMulterError(error);

    sendErrorProd(error, req, res);
  }
}; 