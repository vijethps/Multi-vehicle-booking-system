const { query, getClient } = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const { SEAT_HOLD_MINUTES } = require('../../config/constants');
const { addMinutes } = require('../../utils/dateHelpers');

/**
 * Place holds on multiple seats for a trip.
 * Uses a transaction + advisory lock to prevent race conditions.
 */
const holdSeats = async (tripId, seatIds, userId, bookingId = null) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Advisory lock per trip to serialize concurrent hold attempts
    await client.query('SELECT pg_advisory_xact_lock($1)', [hashTripId(tripId)]);

    // Clean expired holds first
    await client.query(
      'DELETE FROM seat_holds WHERE trip_id=$1 AND expires_at <= NOW()',
      [tripId]
    );

    // Check each seat: is it already booked or held?
    const conflictCheck = await client.query(
      `SELECT s.seat_number,
         CASE WHEN bs.id IS NOT NULL THEN 'booked'
              WHEN sh.id IS NOT NULL THEN 'held'
         END AS conflict_reason
       FROM seats s
       LEFT JOIN booking_seats bs ON bs.seat_id = s.id AND bs.trip_id = $1
       LEFT JOIN seat_holds sh ON sh.seat_id = s.id AND sh.trip_id = $1 AND sh.expires_at > NOW()
       WHERE s.id = ANY($2)
         AND (bs.id IS NOT NULL OR sh.id IS NOT NULL)`,
      [tripId, seatIds]
    );

    if (conflictCheck.rows.length > 0) {
      const conflicted = conflictCheck.rows.map((r) => r.seat_number).join(', ');
      throw ApiError.conflict(`Seats no longer available: ${conflicted}`);
    }

    // Insert holds
    const expiresAt = addMinutes(new Date(), SEAT_HOLD_MINUTES);
    const holdIds = [];

    for (const seatId of seatIds) {
      const result = await client.query(
        `INSERT INTO seat_holds (seat_id, trip_id, user_id, booking_id, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (seat_id, trip_id) DO UPDATE
           SET user_id=$3, booking_id=$4, expires_at=$5
         RETURNING id`,
        [seatId, tripId, userId, bookingId, expiresAt]
      );
      holdIds.push(result.rows[0].id);
    }

    await client.query('COMMIT');
    return { holdIds, expiresAt };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Release holds for a user on a trip (e.g., when they navigate away)
 */
const releaseHolds = async (tripId, seatIds, userId) => {
  await query(
    `DELETE FROM seat_holds
     WHERE trip_id=$1 AND seat_id=ANY($2) AND user_id=$3`,
    [tripId, seatIds, userId]
  );
};

/**
 * Confirm holds → booking_seats (called inside booking transaction)
 */
const confirmSeats = async (client, tripId, seatIds, bookingId, baseFare, seatPriceMap) => {
  for (const seatId of seatIds) {
    const seatPrice = seatPriceMap[seatId] ?? baseFare;
    await client.query(
      `INSERT INTO booking_seats (booking_id, seat_id, trip_id, seat_price)
       VALUES ($1, $2, $3, $4)`,
      [bookingId, seatId, tripId, seatPrice]
    );
  }

  // Remove the holds
  await client.query(
    `DELETE FROM seat_holds WHERE trip_id=$1 AND seat_id=ANY($2)`,
    [tripId, seatIds]
  );
};

/**
 * Get all seat layouts
 */
const getSeatLayouts = async () => {
  const result = await query('SELECT * FROM seat_layouts ORDER BY name');
  return result.rows;
};

/**
 * Get a layout with its seats
 */
const getLayoutWithSeats = async (layoutId) => {
  const layoutResult = await query('SELECT * FROM seat_layouts WHERE id=$1', [layoutId]);
  if (!layoutResult.rows.length) throw ApiError.notFound('Layout not found');

  const seatsResult = await query(
    'SELECT * FROM seats WHERE layout_id=$1 AND is_active=TRUE ORDER BY row_number, position',
    [layoutId]
  );

  return { layout: layoutResult.rows[0], seats: seatsResult.rows };
};

/**
 * Create a seat layout with seats
 */
const createLayout = async (data) => {
  const { name, description, rows, cols_lower, cols_upper, has_upper_deck, seats } = data;

  const layoutResult = await query(
    `INSERT INTO seat_layouts (name, description, rows, cols_lower, cols_upper, has_upper_deck)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [name, description || null, rows, cols_lower, cols_upper || null, has_upper_deck ?? false]
  );
  const layout = layoutResult.rows[0];

  if (seats && seats.length) {
    for (const seat of seats) {
      await query(
        `INSERT INTO seats (layout_id, seat_number, row_number, position, deck, seat_type, extra_charge)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [layout.id, seat.seat_number, seat.row_number, seat.position,
         seat.deck || 'single', seat.seat_type || 'seater', seat.extra_charge || 0]
      );
    }
  }

  return getLayoutWithSeats(layout.id);
};

/**
 * Hash a UUID trip ID to a bigint for pg_advisory_lock
 */
const hashTripId = (tripId) => {
  let hash = 0;
  for (let i = 0; i < tripId.length; i++) {
    const char = tripId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit int
  }
  return Math.abs(hash);
};

module.exports = {
  holdSeats, releaseHolds, confirmSeats,
  getSeatLayouts, getLayoutWithSeats, createLayout,
};
