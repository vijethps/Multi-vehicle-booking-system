const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Run after express-validator chains.
 * Collects errors and throws a 400 if any exist.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((e) => ({
      field: e.path || e.param,
      message: e.msg,
    }));
    return next(ApiError.badRequest('Validation failed', formattedErrors));
  }
  next();
};

module.exports = validate;
