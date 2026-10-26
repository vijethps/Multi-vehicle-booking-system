const { query, getClient } = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { calculateRentalPrice, calculateSeatBookingPrice } = require('./pricing.service');
const { confirmSeats } = require('../seats/seats.service');
const vehicleService = require('../vehicles/vehicles.service');

/**
 * Generate a human-readable booking number
 */
const generateBookingNumber = async (client) => {
  const result = await client.query("SELECT nextval('booking_number_seq') AS seq");
  const seq = result.rows[0].seq;
  const prefix = 'BK';
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `${prefix}${date}${seq}`;
};

/**
 * Record a status change in the history table
 */
const recordStatusChange = async (client, bookingId, oldStatus, newStatus, changedBy, reason) => {
  await client.query(
    `INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, reason)
     VALUES ($1,$2,$3,$4,$5)`,
    [bookingId, oldStatus || null, newStatus, changedBy || null, reason || null]
  );
};

/**
 * Create a new booking (vehicle rental or seat booking)
 */
const createBooking = async (userId, data) => {
  const {
    booking_type, vehicle_id, trip_id, seat_ids,
    pickup_datetime, return_datetime,
    pickup_location, dropoff_location,
    boarding_stop_id, dropping_stop_id,
    passenger_count, driver_required,
    distance_km,
    // Goods transport
    cargo_description, cargo_weight_kg, cargo_volume_cbm,
    delivery_address, special_handling,
    notes,
    // Passenger details for seat booking
    passenger_details,
  } = data;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    let pricing;
    let seatPriceMap = {};

    // ── Calculate pricing ──────────────────────────────────────
    if (booking_type === 'seat_booking') {
      if (!trip_id || !seat_ids?.length) {
        throw ApiError.badRequest('trip_id and seat_ids required for seat booking');
      }
      pricing = await calculateSeatBookingPrice(trip_id, seat_ids);
      seatPriceMap = pricing.seatPriceMap;
    } else {
      if (!vehicle_id || !pickup_datetime || !return_datetime) {
        throw ApiError.badRequest('vehicle_id, pickup_datetime, return_datetime required');
      }
      pricing = await calculateRentalPrice(vehicle_id, pickup_datetime, return_datetime, {
        distance_km, driver_required,
      });
    }

    // ── Availability check (rental types) ─────────────────────
    if (booking_type !== 'seat_booking' && vehicle_id) {
      const availability = await vehicleService.checkAvailability(
        vehicle_id, pickup_datetime, return_datetime
      );
      if (!availability.available) {
        throw ApiError.conflict('Vehicle is not available for the selected period');
      }
    }

    // ── Create booking record ──────────────────────────────────
    const bookingNumber = await generateBookingNumber(client);

    const bookingResult = await client.query(
      `INSERT INTO bookings
         (booking_number, user_id, vehicle_id, trip_id,
          booking_type, booking_status, payment_status,
          pickup_datetime, return_datetime,
          pickup_location, dropoff_location,
          boarding_stop_id, dropping_stop_id,
          passenger_count, driver_required,
          subtotal, discount_amount, tax_amount, service_fee,
          total_amount, security_deposit,
          driver_charge,
          cargo_description, cargo_weight_kg, cargo_volume_cbm,
          delivery_address, special_handling, notes)
       VALUES
         ($1,$2,$3,$4,$5,'pending_payment','pending',
          $6,$7,$8,$9,$10,$11,$12,$13,
          $14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26)
       RETURNING *`,
      [
        bookingNumber, userId, vehicle_id || null, trip_id || null,
        booking_type,
        pickup_datetime || null, return_datetime || null,
        pickup_location || null, dropoff_location || null,
        boarding_stop_id || null, dropping_stop_id || null,
        passenger_count || 1, driver_required || false,
        pricing.subtotal, pricing.discount_amount, pricing.tax_amount, pricing.service_fee,
        pricing.total_amount, pricing.security_deposit,
        pricing.driver_charge || 0,
        cargo_description || null, cargo_weight_kg || null, cargo_volume_cbm || null,
        delivery_address || null, special_handling || null, notes || null,
      ]
    );
    const booking = bookingResult.rows[0];

    // ── Confirm seat holds → booking_seats ────────────────────
    if (booking_type === 'seat_booking') {
      // Verify holds still exist for this user
      const holdCheck = await client.query(
        `SELECT seat_id FROM seat_holds
         WHERE trip_id=$1 AND seat_id=ANY($2) AND user_id=$3 AND expires_at > NOW()`,
        [trip_id, seat_ids, userId]
      );
      if (holdCheck.rows.length !== seat_ids.length) {
        throw ApiError.conflict(
          'One or more seat holds have expired. Please re-select your seats.'
        );
      }

      const baseFare = parseFloat((await query('SELECT base_fare FROM trips WHERE id=$1', [trip_id])).rows[0].base_fare);

      await confirmSeats(client, trip_id, seat_ids, booking.id, baseFare, seatPriceMap);

      // Add passenger details if provided
      if (passenger_details && passenger_details.length) {
        for (let i = 0; i < passenger_details.length && i < seat_ids.length; i++) {
          const pd = passenger_details[i];
          await client.query(
            `UPDATE booking_seats SET passenger_name=$1, passenger_age=$2, passenger_gender=$3
             WHERE booking_id=$4 AND seat_id=$5`,
            [pd.name || null, pd.age || null, pd.gender || null, booking.id, seat_ids[i]]
          );
        }
      }
    }

    // ── Record initial status ──────────────────────────────────
    await recordStatusChange(client, booking.id, null, 'pending_payment', userId, 'Booking created');

    await client.query('COMMIT');
    return booking;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get bookings for the current user
 */
const getMyBookings = async (userId, queryParams) => {
  const { page, limit, offset } = getPagination(queryParams);
  const conditions = ['b.user_id=$1'];
  const values = [userId];
  let i = 2;

  if (queryParams.status) {
    conditions.push(`b.booking_status=$${i++}`);
    values.push(queryParams.status);
  }
  if (queryParams.booking_type) {
    conditions.push(`b.booking_type=$${i++}`);
    values.push(queryParams.booking_type);
  }

  const where = conditions.join(' AND ');
  const total = parseInt(
    (await query(`SELECT COUNT(*) FROM bookings b WHERE ${where}`, values)).rows[0].count
  );

  const result = await query(
    `SELECT b.*,
       v.name AS vehicle_name, v.model,
       vc.name AS category_name, vc.category AS category_type,
       r.origin, r.destination,
       t.departure_time, t.arrival_time,
       COALESCE(
         (SELECT json_agg(json_build_object(
            'seat_number', s.seat_number, 'seat_type', s.seat_type,
            'seat_price', bs.seat_price,
            'passenger_name', bs.passenger_name
          ))
          FROM booking_seats bs JOIN seats s ON s.id=bs.seat_id
          WHERE bs.booking_id=b.id), '[]'
       ) AS seats
     FROM bookings b
     LEFT JOIN vehicles v ON v.id=b.vehicle_id
     LEFT JOIN vehicle_categories vc ON vc.id=v.category_id
     LEFT JOIN trips t ON t.id=b.trip_id
     LEFT JOIN routes r ON r.id=t.route_id
     WHERE ${where}
     ORDER BY b.created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...values, limit, offset]
  );

  return { bookings: result.rows, pagination: buildPaginationMeta(total, page, limit) };
};

/**
 * Get single booking (checks ownership for customers)
 */
const getBookingById = async (bookingId, userId, userRole) => {
  const result = await query(
    `SELECT b.*,
       v.name AS vehicle_name, v.model, v.fuel_type, v.ac,
       vc.name AS category_name, vc.category AS category_type,
       r.origin, r.destination, r.distance_km,
       t.departure_time, t.arrival_time, t.status AS trip_status,
       COALESCE(
         (SELECT json_agg(json_build_object(
            'seat_number', s.seat_number, 'seat_type', s.seat_type,
            'deck', s.deck, 'seat_price', bs.seat_price,
            'passenger_name', bs.passenger_name,
            'passenger_age', bs.passenger_age,
            'passenger_gender', bs.passenger_gender
          ) ORDER BY s.row_number)
          FROM booking_seats bs JOIN seats s ON s.id=bs.seat_id
          WHERE bs.booking_id=b.id), '[]'
       ) AS seats,
       COALESCE(
         (SELECT json_agg(json_build_object(
            'old_status', bsh.old_status, 'new_status', bsh.new_status,
            'reason', bsh.reason, 'created_at', bsh.created_at
          ) ORDER BY bsh.created_at)
          FROM booking_status_history bsh WHERE bsh.booking_id=b.id), '[]'
       ) AS status_history,
       (SELECT json_build_object(
           'id', p.id, 'amount', p.amount, 'payment_status', p.payment_status,
           'gateway', p.gateway, 'paid_at', p.paid_at
        ) FROM payments p WHERE p.booking_id=b.id
          ORDER BY p.created_at DESC LIMIT 1
       ) AS latest_payment
     FROM bookings b
     LEFT JOIN vehicles v ON v.id=b.vehicle_id
     LEFT JOIN vehicle_categories vc ON vc.id=v.category_id
     LEFT JOIN trips t ON t.id=b.trip_id
     LEFT JOIN routes r ON r.id=t.route_id
     WHERE b.id=$1`,
    [bookingId]
  );

  if (!result.rows.length) throw ApiError.notFound('Booking not found');
  const booking = result.rows[0];

  if (userRole === 'customer' && booking.user_id !== userId) {
    throw ApiError.forbidden('Access denied');
  }

  return booking;
};

/**
 * Cancel a booking
 */
const cancelBooking = async (bookingId, userId, userRole, reason) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      'SELECT * FROM bookings WHERE id=$1 FOR UPDATE',
      [bookingId]
    );
    if (!result.rows.length) throw ApiError.notFound('Booking not found');
    const booking = result.rows[0];

    if (userRole === 'customer' && booking.user_id !== userId) {
      throw ApiError.forbidden('Access denied');
    }

    const cancellableStatuses = ['pending_payment', 'pending_approval', 'confirmed'];
    if (!cancellableStatuses.includes(booking.booking_status)) {
      throw ApiError.badRequest(
        `Cannot cancel a booking with status: ${booking.booking_status}`
      );
    }

    // Simple refund policy: full refund if not yet active
    const refundAmount = ['confirmed', 'pending_payment'].includes(booking.booking_status)
      ? parseFloat(booking.total_amount)
      : 0;

    await client.query(
      `UPDATE bookings
       SET booking_status='cancelled', cancelled_at=NOW(),
           cancellation_reason=$1, refund_amount=$2,
           payment_status = CASE WHEN payment_status='success' THEN 'refunded' ELSE payment_status END
       WHERE id=$3`,
      [reason || null, refundAmount, bookingId]
    );

    // Release seat holds / booking_seats
    if (booking.booking_type === 'seat_booking' && booking.trip_id) {
      await client.query(
        `DELETE FROM seat_holds WHERE booking_id=$1`, [bookingId]
      );
      // Note: booking_seats are kept for audit; seat becomes available again when booking is cancelled
      // The query for available seats checks booking_status
    }

    await recordStatusChange(
      client, bookingId, booking.booking_status, 'cancelled', userId, reason
    );

    await client.query('COMMIT');
    return { booking_id: bookingId, refund_amount: refundAmount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Admin: get all bookings
 */
const getAllBookings = async (queryParams) => {
  const { page, limit, offset } = getPagination(queryParams);
  const conditions = ['1=1'];
  const values = [];
  let i = 1;

  if (queryParams.status) { conditions.push(`b.booking_status=$${i++}`); values.push(queryParams.status); }
  if (queryParams.booking_type) { conditions.push(`b.booking_type=$${i++}`); values.push(queryParams.booking_type); }
  if (queryParams.user_id) { conditions.push(`b.user_id=$${i++}`); values.push(queryParams.user_id); }
  if (queryParams.vehicle_id) { conditions.push(`b.vehicle_id=$${i++}`); values.push(queryParams.vehicle_id); }
  if (queryParams.date_from) { conditions.push(`b.created_at >= $${i++}`); values.push(queryParams.date_from); }
  if (queryParams.date_to) { conditions.push(`b.created_at <= $${i++}`); values.push(queryParams.date_to); }

  const where = conditions.join(' AND ');
  const total = parseInt(
    (await query(`SELECT COUNT(*) FROM bookings b WHERE ${where}`, values)).rows[0].count
  );

  const result = await query(
    `SELECT b.*,
       u.email, u.first_name, u.last_name,
       v.name AS vehicle_name, vc.name AS category_name
     FROM bookings b
     JOIN users u ON u.id=b.user_id
     LEFT JOIN vehicles v ON v.id=b.vehicle_id
     LEFT JOIN vehicle_categories vc ON vc.id=v.category_id
     WHERE ${where}
     ORDER BY b.created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...values, limit, offset]
  );

  return { bookings: result.rows, pagination: buildPaginationMeta(total, page, limit) };
};

/**
 * Admin: confirm a booking manually
 */
const confirmBooking = async (bookingId, adminId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      "SELECT * FROM bookings WHERE id=$1 AND booking_status='pending_approval' FOR UPDATE",
      [bookingId]
    );
    if (!result.rows.length) {
      throw ApiError.badRequest('Booking not eligible for confirmation');
    }
    await client.query(
      "UPDATE bookings SET booking_status='confirmed', updated_at=NOW() WHERE id=$1",
      [bookingId]
    );
    await recordStatusChange(client, bookingId, 'pending_approval', 'confirmed', adminId, 'Manually confirmed by admin');
    await client.query('COMMIT');
    return { booking_id: bookingId, status: 'confirmed' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  createBooking, getMyBookings, getBookingById,
  cancelBooking, getAllBookings, confirmBooking,
};
