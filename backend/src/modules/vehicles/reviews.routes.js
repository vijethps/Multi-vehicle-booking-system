const express = require('express');
const router = express.Router();
const { query } = require('../../config/database');
const { authenticate, authorize } = require('../../middleware/auth');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');

// GET /api/vehicles/:id/reviews  (public)
router.get('/:id/reviews', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.first_name, u.last_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.vehicle_id=$1 AND r.is_approved=TRUE
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    ApiResponse.success(res, { reviews: result.rows });
  } catch (err) { next(err); }
});

// POST /api/vehicles/:id/reviews  (customer, requires completed booking)
router.post(
  '/:id/reviews',
  authenticate,
  [
    body('rating').isInt({ min:1, max:5 }).withMessage('Rating must be 1-5'),
    body('booking_id').isUUID().withMessage('Valid booking ID required'),
    body('comment').optional().trim(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { rating, comment, booking_id } = req.body;
      const vehicleId = req.params.id;

      // Verify booking belongs to user and is completed
      const bk = await query(
        `SELECT id FROM bookings
         WHERE id=$1 AND user_id=$2 AND vehicle_id=$3
           AND booking_status='completed'`,
        [booking_id, req.user.id, vehicleId]
      );
      if (!bk.rows.length) {
        throw ApiError.badRequest('You can only review vehicles from completed bookings');
      }

      const result = await query(
        `INSERT INTO reviews (booking_id, user_id, vehicle_id, rating, comment)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (booking_id, user_id) DO UPDATE SET rating=$4, comment=$5
         RETURNING *`,
        [booking_id, req.user.id, vehicleId, rating, comment||null]
      );
      ApiResponse.created(res, { review: result.rows[0] }, 'Review submitted. Pending approval.');
    } catch (err) { next(err); }
  }
);

// PATCH /api/admin/reviews/:id/approve  — handled via admin routes below
// We export a separate handler for admin to mount
router.approveReview = async (req, res, next) => {
  try {
    const result = await query(
      'UPDATE reviews SET is_approved=TRUE, updated_at=NOW() WHERE id=$1 RETURNING *',
      [req.params.reviewId]
    );
    if (!result.rows.length) throw ApiError.notFound('Review not found');

    // Recalculate vehicle rating
    const ratingResult = await query(
      `SELECT ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating, COUNT(*) AS total
       FROM reviews WHERE vehicle_id=$1 AND is_approved=TRUE`,
      [result.rows[0].vehicle_id]
    );
    await query(
      'UPDATE vehicles SET rating=$1, total_reviews=$2 WHERE id=$3',
      [ratingResult.rows[0].avg_rating, ratingResult.rows[0].total, result.rows[0].vehicle_id]
    );
    ApiResponse.success(res, { review: result.rows[0] }, 'Review approved');
  } catch (err) { next(err); }
};

module.exports = router;
