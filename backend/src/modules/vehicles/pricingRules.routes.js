const express = require('express');
const router = express.Router();
const { query } = require('../../config/database');
const { authenticate, authorize } = require('../../middleware/auth');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');

// GET /api/vehicles/:id/pricing-rules
router.get('/:id/pricing-rules', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM pricing_rules WHERE vehicle_id=$1 ORDER BY created_at DESC',
      [req.params.id]
    );
    ApiResponse.success(res, { rules: result.rows });
  } catch (err) { next(err); }
});

// POST /api/vehicles/:id/pricing-rules
router.post(
  '/:id/pricing-rules',
  authenticate,
  authorize('admin', 'fleet_manager'),
  [
    body('name').trim().notEmpty().withMessage('Rule name required'),
    body('pricing_method').isIn(['hourly','daily','per_km','fixed','seat_based']).withMessage('Valid pricing method required'),
    body('base_rate').isNumeric().withMessage('Base rate required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, pricing_method, base_rate, min_amount, max_amount, applies_from, applies_until } = req.body;
      const result = await query(
        `INSERT INTO pricing_rules (vehicle_id, name, pricing_method, base_rate, min_amount, max_amount, applies_from, applies_until)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [req.params.id, name, pricing_method, base_rate, min_amount||null, max_amount||null, applies_from||null, applies_until||null]
      );
      ApiResponse.created(res, { rule: result.rows[0] });
    } catch (err) { next(err); }
  }
);

// DELETE /api/vehicles/:id/pricing-rules/:ruleId
router.delete(
  '/:id/pricing-rules/:ruleId',
  authenticate,
  authorize('admin', 'fleet_manager'),
  async (req, res, next) => {
    try {
      const result = await query(
        'DELETE FROM pricing_rules WHERE id=$1 AND vehicle_id=$2 RETURNING id',
        [req.params.ruleId, req.params.id]
      );
      if (!result.rows.length) throw ApiError.notFound('Pricing rule not found');
      ApiResponse.success(res, null, 'Pricing rule deleted');
    } catch (err) { next(err); }
  }
);

module.exports = router;
