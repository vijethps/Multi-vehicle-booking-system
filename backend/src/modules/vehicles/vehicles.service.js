const { query, getClient } = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { rangesOverlap } = require('../../utils/dateHelpers');

const buildVehicleFilters = (queryParams) => {
  const conditions = ['v.is_active = TRUE'];
  const values = [];
  let i = 1;

  if (queryParams.category_id) {
    conditions.push(`v.category_id = $${i++}`);
    values.push(queryParams.category_id);
  }
  if (queryParams.vehicle_type_id) {
    conditions.push(`v.vehicle_type_id = $${i++}`);
    values.push(queryParams.vehicle_type_id);
  }
  if (queryParams.ac !== undefined) {
    conditions.push(`v.ac = $${i++}`);
    values.push(queryParams.ac === 'true');
  }
  if (queryParams.fuel_type) {
    conditions.push(`v.fuel_type = $${i++}`);
    values.push(queryParams.fuel_type);
  }
  if (queryParams.min_capacity) {
    conditions.push(`v.passenger_capacity >= $${i++}`);
    values.push(parseInt(queryParams.min_capacity));
  }
  if (queryParams.max_price) {
    conditions.push(`v.base_price <= $${i++}`);
    values.push(parseFloat(queryParams.max_price));
  }
  if (queryParams.supports_rental === 'true') {
    conditions.push('v.supports_rental = TRUE');
  }
  if (queryParams.supports_seat_booking === 'true') {
    conditions.push('v.supports_seat_booking = TRUE');
  }
  if (queryParams.supports_goods === 'true') {
    conditions.push('v.supports_goods = TRUE');
  }

  return { conditions, values };
};

const getVehicles = async (queryParams) => {
  const { page, limit, offset } = getPagination(queryParams);
  const { conditions, values } = buildVehicleFilters(queryParams);

  const whereClause = conditions.join(' AND ');
  const countResult = await query(
    `SELECT COUNT(*) FROM vehicles v WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].count);

  const dataResult = await query(
    `SELECT
       v.*,
       vc.name AS category_name, vc.slug AS category_slug, vc.category AS category_type,
       vt.name AS type_name,
       COALESCE(
         (SELECT json_agg(json_build_object('url', vi.url, 'is_primary', vi.is_primary, 'alt_text', vi.alt_text)
                          ORDER BY vi.is_primary DESC, vi.sort_order)
          FROM vehicle_images vi WHERE vi.vehicle_id = v.id), '[]'
       ) AS images,
       COALESCE(
         (SELECT json_agg(json_build_object('name', va.name, 'icon', va.icon))
          FROM vehicle_amenities va WHERE va.vehicle_id = v.id), '[]'
       ) AS amenities
     FROM vehicles v
     JOIN vehicle_categories vc ON vc.id = v.category_id
     LEFT JOIN vehicle_types vt ON vt.id = v.vehicle_type_id
     WHERE ${whereClause}
     ORDER BY v.rating DESC, v.created_at DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset]
  );

  return {
    vehicles: dataResult.rows,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

const getVehicleById = async (id) => {
  const result = await query(
    `SELECT
       v.*,
       vc.name AS category_name, vc.slug AS category_slug, vc.category AS category_type,
       vc.supports_rental, vc.supports_seat_booking, vc.supports_charter, vc.supports_goods,
       vt.name AS type_name,
       COALESCE(
         (SELECT json_agg(json_build_object('id', vi.id, 'url', vi.url, 'is_primary', vi.is_primary, 'alt_text', vi.alt_text)
                          ORDER BY vi.is_primary DESC, vi.sort_order)
          FROM vehicle_images vi WHERE vi.vehicle_id = v.id), '[]'
       ) AS images,
       COALESCE(
         (SELECT json_agg(json_build_object('name', va.name, 'icon', va.icon))
          FROM vehicle_amenities va WHERE va.vehicle_id = v.id), '[]'
       ) AS amenities
     FROM vehicles v
     JOIN vehicle_categories vc ON vc.id = v.category_id
     LEFT JOIN vehicle_types vt ON vt.id = v.vehicle_type_id
     WHERE v.id = $1`,
    [id]
  );
  if (!result.rows.length) throw ApiError.notFound('Vehicle not found');
  return result.rows[0];
};

const createVehicle = async (data) => {
  const {
    category_id, vehicle_type_id, name, model, make, year,
    registration_number, color,
    passenger_capacity, cargo_capacity_kg, cargo_capacity_cbm,
    fuel_type, transmission, ac, luggage_capacity,
    supports_rental, supports_seat_booking, supports_charter, supports_goods,
    pricing_method, base_price, min_rental_hours, security_deposit,
    driver_available, driver_charge, description,
  } = data;

  const result = await query(
    `INSERT INTO vehicles
       (category_id, vehicle_type_id, name, model, make, year, registration_number, color,
        passenger_capacity, cargo_capacity_kg, cargo_capacity_cbm,
        fuel_type, transmission, ac, luggage_capacity,
        supports_rental, supports_seat_booking, supports_charter, supports_goods,
        pricing_method, base_price, min_rental_hours, security_deposit,
        driver_available, driver_charge, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
     RETURNING *`,
    [category_id, vehicle_type_id || null, name, model, make, year || null,
     registration_number || null, color || null,
     passenger_capacity || null, cargo_capacity_kg || null, cargo_capacity_cbm || null,
     fuel_type || null, transmission || null, ac ?? false, luggage_capacity || null,
     supports_rental ?? true, supports_seat_booking ?? false, supports_charter ?? false, supports_goods ?? false,
     pricing_method || 'daily', base_price, min_rental_hours || 1, security_deposit || 0,
     driver_available ?? false, driver_charge || 0, description || null]
  );
  return result.rows[0];
};

const updateVehicle = async (id, data) => {
  const existing = await query('SELECT id FROM vehicles WHERE id=$1', [id]);
  if (!existing.rows.length) throw ApiError.notFound('Vehicle not found');

  const allowed = [
    'name', 'model', 'make', 'year', 'color', 'passenger_capacity',
    'cargo_capacity_kg', 'cargo_capacity_cbm', 'fuel_type', 'transmission',
    'ac', 'luggage_capacity', 'supports_rental', 'supports_seat_booking',
    'supports_charter', 'supports_goods', 'pricing_method', 'base_price',
    'min_rental_hours', 'security_deposit', 'driver_available', 'driver_charge',
    'description', 'is_active', 'is_available',
  ];

  const fields = [];
  const values = [];
  let i = 1;
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key}=$${i++}`);
      values.push(data[key]);
    }
  }
  if (!fields.length) throw ApiError.badRequest('No valid fields to update');
  values.push(id);

  const result = await query(
    `UPDATE vehicles SET ${fields.join(',')} WHERE id=$${i} RETURNING *`,
    values
  );
  return result.rows[0];
};

const updateStatus = async (id, is_active) => {
  const result = await query(
    'UPDATE vehicles SET is_active=$1, updated_at=NOW() WHERE id=$2 RETURNING id, is_active',
    [is_active, id]
  );
  if (!result.rows.length) throw ApiError.notFound('Vehicle not found');
  return result.rows[0];
};

const checkAvailability = async (vehicleId, pickupDatetime, returnDatetime) => {
  // Check confirmed/active overlapping bookings
  const bookingConflict = await query(
    `SELECT id FROM bookings
     WHERE vehicle_id = $1
       AND booking_status IN ('confirmed', 'active', 'pending_payment', 'pending_approval')
       AND pickup_datetime < $3
       AND return_datetime > $2`,
    [vehicleId, pickupDatetime, returnDatetime]
  );

  // Check maintenance periods
  const maintenanceConflict = await query(
    `SELECT id FROM vehicle_maintenance
     WHERE vehicle_id = $1
       AND start_time < $3
       AND end_time > $2`,
    [vehicleId, pickupDatetime, returnDatetime]
  );

  return {
    available: bookingConflict.rows.length === 0 && maintenanceConflict.rows.length === 0,
    conflicts: {
      bookings: bookingConflict.rows.length,
      maintenance: maintenanceConflict.rows.length,
    },
  };
};

const addVehicleImage = async (vehicleId, { url, alt_text, is_primary, sort_order }) => {
  if (is_primary) {
    await query(
      'UPDATE vehicle_images SET is_primary=FALSE WHERE vehicle_id=$1',
      [vehicleId]
    );
  }
  const result = await query(
    `INSERT INTO vehicle_images (vehicle_id, url, alt_text, is_primary, sort_order)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [vehicleId, url, alt_text || null, is_primary ?? false, sort_order ?? 0]
  );
  return result.rows[0];
};

module.exports = {
  getVehicles, getVehicleById, createVehicle, updateVehicle,
  updateStatus, checkAvailability, addVehicleImage,
};
