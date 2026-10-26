/**
 * Calculate the number of hours between two dates
 */
const hoursBetween = (start, end) => {
  const ms = new Date(end) - new Date(start);
  return ms / (1000 * 60 * 60);
};

/**
 * Calculate the number of days between two dates (rounded up)
 */
const daysBetween = (start, end) => {
  const hours = hoursBetween(start, end);
  return Math.ceil(hours / 24);
};

/**
 * Check if two date ranges overlap
 */
const rangesOverlap = (start1, end1, start2, end2) => {
  return new Date(start1) < new Date(end2) && new Date(end1) > new Date(start2);
};

/**
 * Add minutes to a date
 */
const addMinutes = (date, minutes) => {
  return new Date(new Date(date).getTime() + minutes * 60000);
};

/**
 * Format date to ISO string
 */
const toISO = (date) => new Date(date).toISOString();

/**
 * Check if date is in the past
 */
const isPast = (date) => new Date(date) < new Date();

/**
 * Check if date is in the future
 */
const isFuture = (date) => new Date(date) > new Date();

module.exports = {
  hoursBetween,
  daysBetween,
  rangesOverlap,
  addMinutes,
  toISO,
  isPast,
  isFuture,
};
