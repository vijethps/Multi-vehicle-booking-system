const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Known operational errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
  }

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        return res.status(409).json({
          success: false,
          message: 'A record with this value already exists.',
          errors: [],
        });
      case '23503': // foreign_key_violation
        return res.status(400).json({
          success: false,
          message: 'Referenced record does not exist.',
          errors: [],
        });
      case '23502': // not_null_violation
        return res.status(400).json({
          success: false,
          message: `Required field missing: ${err.column || 'unknown'}`,
          errors: [],
        });
      default:
        break;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token', errors: [] });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired', errors: [] });
  }

  // Unexpected errors — don't leak details in production
  return res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Internal server error',
    errors: [],
  });
};

module.exports = errorHandler;
