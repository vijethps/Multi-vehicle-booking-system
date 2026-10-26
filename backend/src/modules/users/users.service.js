const { query } = require('../../config/database');
const ApiError = require('../../utils/ApiError');

const getProfile = async (userId) => {
  const result = await query(
    `SELECT id, email, first_name, last_name, phone, role, avatar_url, created_at
     FROM users WHERE id=$1`,
    [userId]
  );
  if (!result.rows.length) throw ApiError.notFound('User not found');
  return result.rows[0];
};

const getBookingSummary = async (userId) => {
  const result = await query(
    `SELECT
       COUNT(*) AS total_bookings,
       COUNT(*) FILTER (WHERE booking_status IN ('confirmed','active')) AS upcoming,
       COUNT(*) FILTER (WHERE booking_status='completed') AS completed,
       COUNT(*) FILTER (WHERE booking_status='cancelled') AS cancelled,
       COUNT(*) FILTER (WHERE payment_status='pending') AS pending_payments,
       COALESCE(SUM(total_amount) FILTER (WHERE payment_status='success'), 0) AS total_spent
     FROM bookings
     WHERE user_id=$1`,
    [userId]
  );
  return result.rows[0];
};

const getNotifications = async (userId, { page = 1, limit = 20, unread_only = false }) => {
  const offset = (page - 1) * limit;
  const condition = unread_only ? 'AND is_read=FALSE' : '';

  const result = await query(
    `SELECT * FROM notifications
     WHERE user_id=$1 ${condition}
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const unread = parseInt(
    (await query('SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=FALSE', [userId])).rows[0].count
  );

  return { notifications: result.rows, unread_count: unread };
};

const markNotificationRead = async (notificationId, userId) => {
  await query(
    'UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2',
    [notificationId, userId]
  );
};

module.exports = { getProfile, getBookingSummary, getNotifications, markNotificationRead };
