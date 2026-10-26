const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');
const ApiError = require('../../utils/ApiError');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const register = async ({ email, password, first_name, last_name, phone }) => {
  // Check duplicate
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) {
    throw ApiError.conflict('Email already registered');
  }

  const password_hash = await bcrypt.hash(password, 12);

  const result = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role`,
    [email, password_hash, first_name, last_name, phone || null]
  );

  const user = result.rows[0];
  const token = generateToken(user.id);

  return { user, token };
};

const login = async ({ email, password }) => {
  const result = await query(
    'SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = $1',
    [email]
  );

  if (!result.rows.length) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw ApiError.unauthorized('Account is deactivated. Contact support.');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const { password_hash, ...safeUser } = user;
  const token = generateToken(user.id);

  return { user: safeUser, token };
};

const getMe = async (userId) => {
  const result = await query(
    `SELECT id, email, first_name, last_name, phone, role, avatar_url, created_at
     FROM users WHERE id = $1`,
    [userId]
  );
  if (!result.rows.length) throw ApiError.notFound('User not found');
  return result.rows[0];
};

const updateProfile = async (userId, { first_name, last_name, phone }) => {
  const result = await query(
    `UPDATE users SET first_name=$1, last_name=$2, phone=$3, updated_at=NOW()
     WHERE id=$4
     RETURNING id, email, first_name, last_name, phone, role, avatar_url`,
    [first_name, last_name, phone || null, userId]
  );
  return result.rows[0];
};

const changePassword = async (userId, { current_password, new_password }) => {
  const result = await query(
    'SELECT password_hash FROM users WHERE id=$1',
    [userId]
  );
  if (!result.rows.length) throw ApiError.notFound('User not found');

  const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
  if (!valid) throw ApiError.badRequest('Current password is incorrect');

  const new_hash = await bcrypt.hash(new_password, 12);
  await query(
    'UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2',
    [new_hash, userId]
  );
};

module.exports = { register, login, getMe, updateProfile, changePassword };
