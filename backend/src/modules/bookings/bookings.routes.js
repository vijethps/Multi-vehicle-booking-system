const express = require('express');
const router = express.Router();
const ctrl = require('./bookings.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');

// Pricing quote (authenticated)
router.post('/pricing-quote', authenticate, ctrl.getPricingQuote);

// Create booking
router.post(
  '/',
  authenticate,
  [
    body('booking_type')
      .isIn(['vehicle_rental', 'seat_booking', 'full_vehicle_charter', 'goods_transport'])
      .withMessage('Valid booking type required'),
  ],
  validate,
  ctrl.create
);

// My bookings
router.get('/my', authenticate, ctrl.getMyBookings);

// Single booking (customer sees own, admin sees all)
router.get('/:id', authenticate, ctrl.getById);

// Cancel booking
router.post(
  '/:id/cancel',
  authenticate,
  ctrl.cancel
);

module.exports = router;
