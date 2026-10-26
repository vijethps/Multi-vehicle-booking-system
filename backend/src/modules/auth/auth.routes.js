const express = require('express');
const router = express.Router();
const controller = require('./auth.controller');
const { registerValidator, loginValidator, changePasswordValidator } = require('./auth.validator');
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimiter');
const { body } = require('express-validator');

// POST /api/auth/register
router.post('/register', authLimiter, registerValidator, validate, controller.register);

// POST /api/auth/login
router.post('/login', authLimiter, loginValidator, validate, controller.login);

// GET /api/auth/me
router.get('/me', authenticate, controller.getMe);

// PUT /api/auth/profile
router.put(
  '/profile',
  authenticate,
  [
    body('first_name').trim().notEmpty().withMessage('First name required'),
    body('last_name').trim().notEmpty().withMessage('Last name required'),
    body('phone').optional().isMobilePhone(),
  ],
  validate,
  controller.updateProfile
);

// PUT /api/auth/change-password
router.put(
  '/change-password',
  authenticate,
  changePasswordValidator,
  validate,
  controller.changePassword
);

module.exports = router;
