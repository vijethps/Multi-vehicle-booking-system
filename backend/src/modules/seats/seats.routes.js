const express = require('express');
const router = express.Router();
const ctrl = require('./seats.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');

// Seat layouts
router.get('/layouts', ctrl.getLayouts);
router.get('/layouts/:id', ctrl.getLayout);
router.post(
  '/layouts',
  authenticate,
  authorize('admin', 'fleet_manager'),
  [
    body('name').trim().notEmpty().withMessage('Layout name required'),
    body('rows').isInt({ min: 1 }).withMessage('Rows required'),
    body('cols_lower').isInt({ min: 1 }).withMessage('Columns required'),
  ],
  validate,
  ctrl.createLayout
);

// Seat holds (requires auth)
router.post(
  '/hold',
  authenticate,
  [
    body('trip_id').isUUID().withMessage('Valid trip ID required'),
    body('seat_ids').isArray({ min: 1 }).withMessage('At least one seat ID required'),
  ],
  validate,
  ctrl.holdSeats
);

router.post(
  '/release',
  authenticate,
  [
    body('trip_id').isUUID().withMessage('Valid trip ID required'),
    body('seat_ids').isArray({ min: 1 }).withMessage('At least one seat ID required'),
  ],
  validate,
  ctrl.releaseHolds
);

module.exports = router;
