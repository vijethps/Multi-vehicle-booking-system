const { query } = require('../../config/database');
const ApiError = require('../../utils/ApiError');

const getAllRoutes = async () => {
  const result = await query(`
    SELECT r.*,
      COALESCE(
        (SELECT json_agg(json_build_object(
           'id', rs.id, 'stop_name', rs.stop_name, 'stop_order', rs.stop_order,
           'distance_from_origin_km', rs.distance_from_origin_km,
           'arrival_offset_minutes', rs.arrival_offset_minutes
         ) ORDER BY rs.stop_order)
         FROM route_stops rs WHERE rs.route_id = r.id), '[]'
      ) AS stops
    FROM routes r WHERE r.is_active = TRUE ORDER BY r.origin, r.destination
  `);
  return result.rows;
};

const getRouteById = async (id) => {
  const result = await query(`
    SELECT r.*,
      COALESCE(
        (SELECT json_agg(json_build_object(
           'id', rs.id, 'stop_name', rs.stop_name, 'stop_order', rs.stop_order,
           'distance_from_origin_km', rs.distance_from_origin_km,
           'arrival_offset_minutes', rs.arrival_offset_minutes
         ) ORDER BY rs.stop_order)
         FROM route_stops rs WHERE rs.route_id = r.id), '[]'
      ) AS stops
    FROM routes r WHERE r.id = $1
  `, [id]);
  if (!result.rows.length) throw ApiError.notFound('Route not found');
  return result.rows[0];
};

const createRoute = async ({ origin, destination, distance_km, stops }) => {
  const existing = await query(
    'SELECT id FROM routes WHERE origin=$1 AND destination=$2',
    [origin, destination]
  );
  if (existing.rows.length) throw ApiError.conflict('Route already exists');

  const routeResult = await query(
    `INSERT INTO routes (origin, destination, distance_km) VALUES ($1,$2,$3) RETURNING *`,
    [origin, destination, distance_km || null]
  );
  const route = routeResult.rows[0];

  if (stops && stops.length) {
    for (const stop of stops) {
      await query(
        `INSERT INTO route_stops (route_id, stop_name, stop_order, distance_from_origin_km, arrival_offset_minutes)
         VALUES ($1,$2,$3,$4,$5)`,
        [route.id, stop.stop_name, stop.stop_order, stop.distance_from_origin_km || null, stop.arrival_offset_minutes || null]
      );
    }
  }

  return getRouteById(route.id);
};

const updateRoute = async (id, data) => {
  const result = await query(
    `UPDATE routes SET origin=$1, destination=$2, distance_km=$3, updated_at=NOW()
     WHERE id=$4 RETURNING *`,
    [data.origin, data.destination, data.distance_km || null, id]
  );
  if (!result.rows.length) throw ApiError.notFound('Route not found');
  return result.rows[0];
};

module.exports = { getAllRoutes, getRouteById, createRoute, updateRoute };
