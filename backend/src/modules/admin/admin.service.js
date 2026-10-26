const { query } = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const { processRefund } = require('../payments/payments.service');

/**
 * Dashboard summary stats
 */
const getDashboardStats = async () => {
  const [
    vehicleStats, bookingStats, revenueStats, tripStats, userStats
  ] = await Promise.all([
    // Vehicle counts
    query(`
      SELECT
        COUNT(*) FILTER (WHERE is_active)        AS total_active,
        COUNT(*) FILTER (WHERE NOT is_active)    AS total_inactive,
        COUNT(*) FILTER (WHERE is_available AND is_active) AS available
      FROM vehicles
    `),
    // Booking counts
    query(`
      SELECT
        COUNT(*)                                             AS total,
        COUNT(*) FILTER (WHERE booking_status='confirmed')  AS confirmed,
        COUNT(*) FILTER (WHERE booking_status='pending_payment') AS pending_payment,
        COUNT(*) FILTER (WHERE booking_status='active')     AS active,
        COUNT(*) FILTER (WHERE booking_status='completed')  AS completed,
        COUNT(*) FILTER (WHERE booking_status='cancelled')  AS cancelled,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS last_7_days
      FROM bookings
    `),
    // Revenue
    query(`
      SELECT
        COALESCE(SUM(total_amount) FILTER (WHERE booking_status IN ('confirmed','active','completed') AND payment_status='success'), 0) AS confirmed_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE booking_status='completed' AND payment_status='success'), 0) AS total_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days' AND payment_status='success'), 0) AS last_30_days,
        COALESCE(SUM(refund_amount) FILTER (WHERE booking_status='cancelled'), 0) AS total_refunds
      FROM bookings
    `),
    // Trips
    query(`
      SELECT
        COUNT(*) FILTER (WHERE status='scheduled') AS scheduled,
        COUNT(*) FILTER (WHERE status='boarding')  AS boarding,
        COUNT(*) FILTER (WHERE status='departed')  AS in_transit,
        COUNT(*) FILTER (WHERE travel_date=CURRENT_DATE) AS today
      FROM trips
    `),
    // Users
    query(`
      SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE role='customer') AS customers
      FROM users WHERE is_active=TRUE
    `),
  ]);

  return {
    vehicles: vehicleStats.rows[0],
    bookings: bookingStats.rows[0],
    revenue: revenueStats.rows[0],
    trips: tripStats.rows[0],
    users: userStats.rows[0],
  };
};

/**
 * Revenue by date range, optionally grouped by category
 */
const getRevenueReport = async ({ date_from, date_to, group_by = 'day' }) => {
  const df = date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const dt = date_to || new Date().toISOString();

  const byCategory = await query(`
    SELECT
      vc.name AS category_name,
      vc.category AS category_type,
      COUNT(b.id) AS booking_count,
      COALESCE(SUM(b.total_amount) FILTER (WHERE b.payment_status='success'), 0) AS revenue,
      b.booking_type
    FROM bookings b
    LEFT JOIN vehicles v ON v.id=b.vehicle_id
    LEFT JOIN vehicle_categories vc ON vc.id=v.category_id
    WHERE b.created_at BETWEEN $1 AND $2
      AND b.booking_status NOT IN ('draft','expired','payment_failed')
    GROUP BY vc.name, vc.category, b.booking_type
    ORDER BY revenue DESC
  `, [df, dt]);

  const byDate = await query(`
    SELECT
      DATE_TRUNC($1, b.created_at)::DATE AS period,
      COUNT(b.id) AS booking_count,
      COALESCE(SUM(b.total_amount) FILTER (WHERE b.payment_status='success'), 0) AS revenue
    FROM bookings b
    WHERE b.created_at BETWEEN $2 AND $3
      AND b.booking_status NOT IN ('draft','expired','payment_failed')
    GROUP BY period
    ORDER BY period
  `, [group_by, df, dt]);

  return { by_category: byCategory.rows, by_date: byDate.rows };
};

/**
 * Fleet utilization report
 */
const getFleetReport = async ({ date_from, date_to }) => {
  const df = date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const dt = date_to || new Date().toISOString();

  const result = await query(`
    SELECT
      v.id, v.name, v.model,
      vc.name AS category_name,
      COUNT(b.id) AS total_bookings,
      COUNT(b.id) FILTER (WHERE b.booking_status='completed') AS completed_bookings,
      COUNT(b.id) FILTER (WHERE b.booking_status='cancelled') AS cancelled_bookings,
      COALESCE(SUM(b.total_amount) FILTER (WHERE b.payment_status='success'), 0) AS revenue
    FROM vehicles v
    JOIN vehicle_categories vc ON vc.id=v.category_id
    LEFT JOIN bookings b ON b.vehicle_id=v.id AND b.created_at BETWEEN $1 AND $2
    WHERE v.is_active=TRUE
    GROUP BY v.id, vc.name
    ORDER BY revenue DESC
  `, [df, dt]);

  return result.rows;
};

/**
 * Get all users (admin)
 */
const getUsers = async ({ page = 1, limit = 20, role, search }) => {
  const offset = (page - 1) * limit;
  const conditions = ['1=1'];
  const values = [];
  let i = 1;

  if (role) { conditions.push(`role=$${i++}`); values.push(role); }
  if (search) {
    conditions.push(`(email ILIKE $${i} OR first_name ILIKE $${i} OR last_name ILIKE $${i})`);
    values.push(`%${search}%`); i++;
  }

  const where = conditions.join(' AND ');
  const total = parseInt(
    (await query(`SELECT COUNT(*) FROM users WHERE ${where}`, values)).rows[0].count
  );
  const users = (await query(
    `SELECT id, email, first_name, last_name, phone, role, is_active, created_at
     FROM users WHERE ${where}
     ORDER BY created_at DESC LIMIT $${i} OFFSET $${i+1}`,
    [...values, limit, offset]
  )).rows;

  return { users, total, page, limit };
};

/**
 * Toggle user active status
 */
const toggleUserStatus = async (userId, is_active) => {
  const result = await query(
    'UPDATE users SET is_active=$1, updated_at=NOW() WHERE id=$2 RETURNING id, email, is_active',
    [is_active, userId]
  );
  if (!result.rows.length) throw ApiError.notFound('User not found');
  return result.rows[0];
};

/**
 * Admin confirm booking
 */
const confirmBooking = async (bookingId, adminId) => {
  const { confirmBooking: cb } = require('../bookings/bookings.service');
  return cb(bookingId, adminId);
};

/**
 * Admin process refund
 */
const adminProcessRefund = async (bookingId, adminId) => {
  return processRefund(bookingId, adminId);
};

module.exports = {
  getDashboardStats, getRevenueReport, getFleetReport,
  getUsers, toggleUserStatus, confirmBooking, adminProcessRefund,
};
