const { query } = require('../../config/database');
const ApiError = require('../../utils/ApiError');

const getAllCategories = async () => {
  const result = await query(`
    SELECT
      vc.*,
      COUNT(v.id) FILTER (WHERE v.is_active AND v.is_available) AS available_count
    FROM vehicle_categories vc
    LEFT JOIN vehicles v ON v.category_id = vc.id
    WHERE vc.is_active = TRUE
    GROUP BY vc.id
    ORDER BY vc.sort_order, vc.name
  `);
  return result.rows;
};

const getCategoryBySlug = async (slug) => {
  const result = await query(
    `SELECT vc.*, json_agg(
       json_build_object('id', vt.id, 'name', vt.name, 'slug', vt.slug, 'default_capacity', vt.default_capacity)
       ORDER BY vt.name
     ) FILTER (WHERE vt.id IS NOT NULL) AS types
     FROM vehicle_categories vc
     LEFT JOIN vehicle_types vt ON vt.category_id = vc.id AND vt.is_active = TRUE
     WHERE vc.slug = $1 AND vc.is_active = TRUE
     GROUP BY vc.id`,
    [slug]
  );
  if (!result.rows.length) throw ApiError.notFound('Category not found');
  return result.rows[0];
};

const createCategory = async (data) => {
  const {
    name, slug, category, description, icon,
    supports_rental, supports_seat_booking,
    supports_charter, supports_goods, sort_order,
  } = data;
  const result = await query(
    `INSERT INTO vehicle_categories
       (name, slug, category, description, icon,
        supports_rental, supports_seat_booking, supports_charter, supports_goods, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [name, slug, category, description, icon,
     supports_rental ?? true, supports_seat_booking ?? false,
     supports_charter ?? false, supports_goods ?? false, sort_order ?? 0]
  );
  return result.rows[0];
};

const updateCategory = async (id, data) => {
  const existing = await query('SELECT id FROM vehicle_categories WHERE id=$1', [id]);
  if (!existing.rows.length) throw ApiError.notFound('Category not found');

  const fields = [];
  const values = [];
  let i = 1;
  const allowed = [
    'name', 'description', 'icon', 'supports_rental',
    'supports_seat_booking', 'supports_charter', 'supports_goods',
    'sort_order', 'is_active',
  ];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key}=$${i++}`);
      values.push(data[key]);
    }
  }
  if (!fields.length) return existing.rows[0];
  values.push(id);
  const result = await query(
    `UPDATE vehicle_categories SET ${fields.join(',')} WHERE id=$${i} RETURNING *`,
    values
  );
  return result.rows[0];
};

const getVehicleTypes = async (categoryId) => {
  const result = await query(
    'SELECT * FROM vehicle_types WHERE category_id=$1 AND is_active=TRUE ORDER BY name',
    [categoryId]
  );
  return result.rows;
};

module.exports = {
  getAllCategories, getCategoryBySlug, createCategory, updateCategory, getVehicleTypes,
};
