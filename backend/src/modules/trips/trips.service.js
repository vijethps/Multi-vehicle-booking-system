const { query, getClient } = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');

const getTrips = async (queryParams) => {
  const { page, limit, offset } = getPagination(queryParams);
  const conditions = ["t.status != 'cancelled'"];
  const values = [];
  let i = 1;

  if (queryParams.route_id) {
    conditions.push(`t.route_id = $${i++}`);
    values.push(queryParams.route_id);
  }
  if (queryParams.travel_date) {
    conditions.push(`t.travel_date = $${i++}`);
    values.push(queryParams.travel_date);
  }
  if (queryParams.origin) {
    conditions.push(`r.origin ILIKE $${i++}`);
    values.push(`%${queryParams.origin}%`);
  }
  if (queryParams.destination) {
    conditions.push(`r.destination ILIKE $${i++}`);
    values.push(`%${queryParams.destination}%`);
  }

  const where = conditions.join(' AND ');

  const countResult = await query(
    `SELECT COUNT(*) FROM trips t JOIN routes r ON r.id=t.route_id WHERE ${where}`,
    values
  );

  const dataResult = await query(
    `SELECT t.*, r.origin, r.destination, r.distance_km,
       v.name AS vehicle_name, vc.name AS category_name,
       (SELECT COUNT(*) FROM booking_seats bs WHERE bs.trip_id = t.id) AS booked_seats,
       (SELECT COUNT(*) FROM seats s WHERE s.layout_id = t.layout_id AND s.is_active=TRUE) AS total_seats
     FROM trips t
     JOIN routes r ON r.id = t.route_id
     JOIN vehicles v ON v.id = t.vehicle_id
     JOIN vehicle_categories vc ON vc.id = v.category_id
     WHERE ${where}
     ORDER BY t.departure_time
     LIMIT $${i} OFFSET $${i + 1}`,
    [...values, limit, offset]
  );

  return {
    trips: dataResult.rows,
    pagination: buildPaginationMeta(parseInt(countResult.rows[0].count), page, limit),
  };
};

const getTripById = async (id) => {
  const result = await query(
    `SELECT t.*, r.origin, r.destination, r.distance_km,
       v.name AS vehicle_name, v.ac, v.passenger_capacity,
       vc.name AS category_name,
       json_agg(json_build_object(
         'id', rs.id, 'stop_name', rs.stop_name, 'stop_order', rs.stop_order,
         'distance_from_origin_km', rs.distance_from_origin_km,
         'arrival_offset_minutes', rs.arrival_offset_minutes
       ) ORDER BY rs.stop_order) FILTER (WHERE rs.id IS NOT NULL) AS stops,
       (SELECT COUNT(*) FROM seats s WHERE s.layout_id=t.layout_id AND s.is_active=TRUE) AS total_seats,
       (SELECT COUNT(*) FROM booking_seats bs WHERE bs.trip_id=t.id) AS booked_seats
     FROM trips t
     JOIN routes r ON r.id = t.route_id
     JOIN vehicles v ON v.id = t.vehicle_id
     JOIN vehicle_categories vc ON vc.id = v.category_id
     LEFT JOIN route_stops rs ON rs.route_id = r.id
     WHERE t.id = $1
     GROUP BY t.id, r.id, v.id, vc.id`,
    [id]
  );
  if (!result.rows.length) throw ApiError.notFound('Trip not found');
  return result.rows[0];
};

const getTripSeats = async (tripId) => {
  // Get all seats for this trip's layout with booking status
  const tripResult = await query(
    'SELECT layout_id FROM trips WHERE id=$1', [tripId]
  );
  if (!tripResult.rows.length) throw ApiError.notFound('Trip not found');
  const layoutId = tripResult.rows[0].layout_id;

  // Get seats with their booking status for this trip
  const result = await query(
    `SELECT
       s.*,
       CASE
         WHEN bs.id IS NOT NULL THEN 'booked'
         WHEN sh.id IS NOT NULL AND sh.expires_at > NOW() THEN 'held'
         ELSE 'available'
       END AS seat_status,
       sh.expires_at AS hold_expires_at
     FROM seats s
     LEFT JOIN booking_seats bs ON bs.seat_id = s.id AND bs.trip_id = $1
     LEFT JOIN seat_holds sh ON sh.seat_id = s.id AND sh.trip_id = $1 AND sh.expires_at > NOW()
     WHERE s.layout_id = $2 AND s.is_active = TRUE
     ORDER BY s.row_number, s.position`,
    [tripId, layoutId]
  );
  return result.rows;
};

const createTrip = async (data, userId) => {
  const { route_id, vehicle_id, layout_id, departure_time, arrival_time, base_fare, booking_cutoff, notes } = data;

  // Check vehicle isn't already on another trip that overlaps
  const conflict = await query(
    `SELECT id FROM trips
     WHERE vehicle_id = $1
       AND status NOT IN ('cancelled', 'completed')
       AND departure_time < $3
       AND arrival_time > $2`,
    [vehicle_id, departure_time, arrival_time]
  );
  if (conflict.rows.length) throw ApiError.conflict('Vehicle is already scheduled for an overlapping trip');

  const result = await query(
    `INSERT INTO trips (route_id, vehicle_id, layout_id, departure_time, arrival_time, travel_date, base_fare, booking_cutoff, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6::TIMESTAMPTZ::DATE,$7,$8,$9,$10)
     RETURNING *`,
    [route_id, vehicle_id, layout_id, departure_time, arrival_time, departure_time, base_fare, booking_cutoff || null, notes || null, userId]
  );
  return result.rows[0];
};

const updateTripStatus = async (id, status) => {
  const result = await query(
    'UPDATE trips SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
    [status, id]
  );
  if (!result.rows.length) throw ApiError.notFound('Trip not found');
  return result.rows[0];
};

module.exports = { getTrips, getTripById, getTripSeats, createTrip, updateTripStatus };
