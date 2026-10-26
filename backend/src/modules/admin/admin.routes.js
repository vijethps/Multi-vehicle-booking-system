const express = require('express');
const router = express.Router();
const ctrl = require('./admin.controller');
const reviewsRouter = require('../vehicles/reviews.routes');
const { authenticate, authorize } = require('../../middleware/auth');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const { query } = require('../../config/database');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');

// All admin routes require authentication + admin/fleet_manager role
const adminAuth = [authenticate, authorize('admin', 'fleet_manager')];
const superAdmin = [authenticate, authorize('admin')];

// Dashboard
router.get('/dashboard', ...adminAuth, ctrl.getDashboard);

// Reports
router.get('/reports/revenue', ...adminAuth, ctrl.getRevenue);
router.get('/reports/fleet', ...adminAuth, ctrl.getFleet);

// Bookings management
router.get('/bookings', ...adminAuth, ctrl.getBookings);
router.get('/bookings/:id', ...adminAuth, ctrl.getBookingDetail);
router.post('/bookings/:id/confirm', ...adminAuth, ctrl.confirmBooking);
router.post('/bookings/:id/refund', ...superAdmin, ctrl.processRefund);

// Users management
router.get('/users', ...superAdmin, ctrl.getUsers);
router.patch(
  '/users/:id/status',
  ...superAdmin,
  [body('is_active').isBoolean()],
  validate,
  ctrl.toggleUser
);

// Reviews management
router.get('/reviews', ...adminAuth, async (req, res, next) => {
  const { query } = require('../../config/database');
  const ApiResponse = require('../../utils/ApiResponse');
  try {
    const result = await query(
      `SELECT r.*, u.first_name, u.last_name, v.name AS vehicle_name
       FROM reviews r
       JOIN users u ON u.id=r.user_id
       LEFT JOIN vehicles v ON v.id=r.vehicle_id
       ORDER BY r.created_at DESC`
    );
    ApiResponse.success(res, { reviews: result.rows });
  } catch (err) { next(err); }
});

router.patch('/reviews/:reviewId/approve', ...adminAuth, reviewsRouter.approveReview);

// Reviews management
router.patch('/reviews/:id/approve', ...superAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const reviewResult = await query(
      'UPDATE reviews SET is_approved=TRUE, updated_at=NOW() WHERE id=$1 RETURNING *',
      [id]
    );
    if (!reviewResult.rows.length) throw ApiError.notFound('Review not found');

    const review = reviewResult.rows[0];

    // Update vehicle rating and total_reviews count
    if (review.vehicle_id) {
      await query(
        `UPDATE vehicles SET
           total_reviews = (
             SELECT COUNT(*) FROM reviews WHERE vehicle_id=$1 AND is_approved=TRUE
           ),
           rating = (
             SELECT ROUND(AVG(rating)::numeric, 2)
             FROM reviews WHERE vehicle_id=$1 AND is_approved=TRUE
           )
         WHERE id=$1`,
        [review.vehicle_id]
      );
    }

    ApiResponse.success(res, { review }, 'Review approved');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
