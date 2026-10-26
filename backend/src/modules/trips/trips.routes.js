const express = require('express');
const router = express.Router();
const ctrl = require('./trips.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');

// Public
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.get('/:id/seats', ctrl.getSeats);

// Admin / Fleet
router.post(
  '/',
  authenticate,
  authorize('admin', 'fleet_manager'),
  [
    body('route_id').isInt().withMessage('Route ID required'),
    body('vehicle_id').isUUID().withMessage('Valid vehicle ID required'),
    body('layout_id').isInt().withMessage('Layout ID required'),
    body('departure_time').isISO8601().withMessage('Valid departure time required'),
    body('arrival_time').isISO8601().withMessage('Valid arrival time required'),
    body('base_fare').isNumeric().withMessage('Base fare required'),
  ],
  validate,
  ctrl.create
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('admin', 'fleet_manager', 'staff'),
  [body('status').notEmpty().withMessage('Status required')],
  validate,
  ctrl.updateStatus
);

module.exports = router;
