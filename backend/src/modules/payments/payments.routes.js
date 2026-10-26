const express = require('express');
const router = express.Router();
const ctrl = require('./payments.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');

// Create payment order
router.post(
  '/create-order',
  authenticate,
  [body('booking_id').isUUID().withMessage('Valid booking ID required')],
  validate,
  ctrl.createOrder
);

// Verify payment after gateway callback
router.post(
  '/verify',
  authenticate,
  [body('gateway_order_id').notEmpty().withMessage('Order ID required')],
  validate,
  ctrl.verifyPayment
);

// Webhook (no auth — uses signature verification)
router.post('/webhook', express.raw({ type: 'application/json' }), ctrl.webhook);

// Payment history for a booking
router.get('/booking/:bookingId', authenticate, ctrl.getHistory);

module.exports = router;
