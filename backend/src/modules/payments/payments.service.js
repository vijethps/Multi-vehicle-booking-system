const { query, getClient } = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const USE_SIMULATION = !process.env.RAZORPAY_KEY_ID ||
  process.env.RAZORPAY_KEY_ID.includes('your_key');

/**
 * Create a payment order.
 * In production this calls Razorpay; in development it uses simulation.
 */
const createOrder = async (bookingId, userId) => {
  const bookingResult = await query(
    `SELECT b.*, u.email, u.first_name, u.last_name
     FROM bookings b JOIN users u ON u.id=b.user_id
     WHERE b.id=$1 AND b.user_id=$2`,
    [bookingId, userId]
  );

  if (!bookingResult.rows.length) throw ApiError.notFound('Booking not found');
  const booking = bookingResult.rows[0];

  if (!['pending_payment', 'payment_failed'].includes(booking.payment_status)) {
    throw ApiError.badRequest(`Payment already processed (status: ${booking.payment_status})`);
  }

  const idempotencyKey = `${bookingId}-${Date.now()}`;
  const amount = parseFloat(booking.total_amount);

  let gatewayOrderId;
  let gateway;

  if (USE_SIMULATION) {
    // ── SIMULATED payment (development only) ────────────────
    gateway = 'simulation';
    gatewayOrderId = `sim_order_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  } else {
    // ── Real Razorpay ────────────────────────────────────────
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: booking.booking_number,
      notes: { booking_id: bookingId },
    });
    gatewayOrderId = order.id;
    gateway = 'razorpay';
  }

  // Save payment record
  const paymentResult = await query(
    `INSERT INTO payments
       (booking_id, user_id, amount, currency, payment_status,
        gateway, gateway_order_id, idempotency_key)
     VALUES ($1,$2,$3,'INR','pending',$4,$5,$6)
     RETURNING *`,
    [bookingId, userId, amount, gateway, gatewayOrderId, idempotencyKey]
  );

  return {
    payment: paymentResult.rows[0],
    order: {
      id: gatewayOrderId,
      amount: Math.round(amount * 100),
      currency: 'INR',
      booking_number: booking.booking_number,
      is_simulation: USE_SIMULATION,
    },
    key: USE_SIMULATION ? 'SIMULATION_MODE' : process.env.RAZORPAY_KEY_ID,
  };
};

/**
 * Verify payment after gateway callback.
 * For simulation: accept any payload with matching order_id.
 * For Razorpay: verify the HMAC signature.
 */
const verifyPayment = async (data) => {
  const { gateway_order_id, gateway_payment_id, gateway_signature, payment_method } = data;

  // Find the payment record
  const paymentResult = await query(
    `SELECT p.*, b.booking_status, b.user_id
     FROM payments p JOIN bookings b ON b.id=p.booking_id
     WHERE p.gateway_order_id=$1 AND p.payment_status='pending'`,
    [gateway_order_id]
  );

  if (!paymentResult.rows.length) {
    throw ApiError.notFound('Payment record not found or already processed');
  }
  const payment = paymentResult.rows[0];

  // Idempotency: if already success, return existing
  const existingSuccess = await query(
    `SELECT id FROM payments WHERE gateway_order_id=$1 AND payment_status='success'`,
    [gateway_order_id]
  );
  if (existingSuccess.rows.length) {
    return { already_processed: true, payment_id: existingSuccess.rows[0].id };
  }

  // ── Signature verification ────────────────────────────────
  if (payment.gateway === 'razorpay' && gateway_signature) {
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${gateway_order_id}|${gateway_payment_id}`)
      .digest('hex');

    if (expectedSig !== gateway_signature) {
      // Mark payment as failed
      await query(
        `UPDATE payments SET payment_status='failed', failure_reason='Signature mismatch', updated_at=NOW() WHERE id=$1`,
        [payment.id]
      );
      throw ApiError.badRequest('Payment signature verification failed');
    }
  }
  // For simulation, no signature check

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Update payment record
    await client.query(
      `UPDATE payments
       SET payment_status='success', gateway_payment_id=$1, gateway_signature=$2,
           payment_method=$3, paid_at=NOW(), updated_at=NOW()
       WHERE id=$4`,
      [gateway_payment_id || `sim_pay_${uuidv4().slice(0, 8)}`,
       gateway_signature || null,
       payment_method || 'unknown',
       payment.id]
    );

    // Update booking status
    await client.query(
      `UPDATE bookings
       SET booking_status='confirmed', payment_status='success', updated_at=NOW()
       WHERE id=$1`,
      [payment.booking_id]
    );

    // Status history
    await client.query(
      `INSERT INTO booking_status_history (booking_id, old_status, new_status, reason)
       VALUES ($1, $2, 'confirmed', 'Payment verified')`,
      [payment.booking_id, payment.booking_status]
    );

    await client.query('COMMIT');
    return { success: true, booking_id: payment.booking_id, payment_id: payment.id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Process a refund for a cancelled booking
 */
const processRefund = async (bookingId, adminId) => {
  const bookingResult = await query(
    `SELECT b.*, p.id AS payment_id, p.gateway_payment_id, p.gateway, p.amount AS paid_amount
     FROM bookings b
     LEFT JOIN payments p ON p.booking_id=b.id AND p.payment_status='success'
     WHERE b.id=$1`,
    [bookingId]
  );

  if (!bookingResult.rows.length) throw ApiError.notFound('Booking not found');
  const booking = bookingResult.rows[0];

  if (booking.booking_status !== 'cancelled') {
    throw ApiError.badRequest('Booking must be cancelled to process a refund');
  }
  if (!booking.payment_id) {
    throw ApiError.badRequest('No successful payment found for this booking');
  }

  const refundAmount = parseFloat(booking.refund_amount) || parseFloat(booking.total_amount);

  const refundResult = await query(
    `INSERT INTO refunds (payment_id, booking_id, amount, reason, status, created_by)
     VALUES ($1,$2,$3,'Booking cancellation','pending',$4)
     RETURNING *`,
    [booking.payment_id, bookingId, refundAmount, adminId]
  );

  // Update payment status
  await query(
    `UPDATE payments SET payment_status='refunded', updated_at=NOW() WHERE id=$1`,
    [booking.payment_id]
  );
  await query(
    `UPDATE bookings SET payment_status='refunded', updated_at=NOW() WHERE id=$1`,
    [bookingId]
  );

  return refundResult.rows[0];
};

/**
 * Get payment history for a booking
 */
const getPaymentHistory = async (bookingId, userId, userRole) => {
  const bookingCheck = await query('SELECT user_id FROM bookings WHERE id=$1', [bookingId]);
  if (!bookingCheck.rows.length) throw ApiError.notFound('Booking not found');
  if (userRole === 'customer' && bookingCheck.rows[0].user_id !== userId) {
    throw ApiError.forbidden('Access denied');
  }

  const result = await query(
    `SELECT p.*, r.amount AS refund_amount, r.status AS refund_status
     FROM payments p
     LEFT JOIN refunds r ON r.payment_id=p.id
     WHERE p.booking_id=$1
     ORDER BY p.created_at DESC`,
    [bookingId]
  );

  return result.rows;
};

module.exports = { createOrder, verifyPayment, processRefund, getPaymentHistory };
