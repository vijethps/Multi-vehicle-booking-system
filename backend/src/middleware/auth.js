const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { query } = require('../config/database');

/**
 * Verify JWT and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user from DB (ensures deactivated users are rejected)
    const result = await query(
      'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!result.rows.length) {
      throw ApiError.unauthorized('User not found');
    }

    const user = result.rows[0];
    if (!user.is_active) {
      throw ApiError.unauthorized('Account is deactivated');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Restrict to specific roles
 * Usage: authorize('admin') or authorize('admin', 'fleet_manager')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }
    next();
  };
};

/**
 * Optional auth — attaches user if token present, doesn't fail if not
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (result.rows.length && result.rows[0].is_active) {
      req.user = result.rows[0];
    }
    next();
  } catch {
    next(); // ignore invalid tokens in optional auth
  }
};

module.exports = { authenticate, authorize, optionalAuth };
