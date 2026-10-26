const { query } = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const { hoursBetween, daysBetween } = require('../../utils/dateHelpers');

const TAX_RATE = 0.05; // 5% GST — configurable via env or DB later

/**
 * Calculate price for a vehicle rental booking
 */
const calculateRentalPrice = async (vehicleId, pickupDatetime, returnDatetime, options = {}) => {
  const vehicleResult = await query(
    `SELECT pricing_method, base_price, security_deposit, driver_charge, min_rental_hours
     FROM vehicles WHERE id=$1 AND is_active=TRUE`,
    [vehicleId]
  );
  if (!vehicleResult.rows.length) throw ApiError.notFound('Vehicle not found');

  const vehicle = vehicleResult.rows[0];
  const hours = hoursBetween(pickupDatetime, returnDatetime);
  const days = daysBetween(pickupDatetime, returnDatetime);

  if (hours <= 0) throw ApiError.badRequest('Return time must be after pickup time');
  if (hours < vehicle.min_rental_hours) {
    throw ApiError.badRequest(
      `Minimum rental duration is ${vehicle.min_rental_hours} hour(s)`
    );
  }

  let subtotal = 0;
  const breakdown = [];

  switch (vehicle.pricing_method) {
    case 'hourly':
      subtotal = parseFloat(vehicle.base_price) * hours;
      breakdown.push({ label: `${hours.toFixed(1)} hrs × ₹${vehicle.base_price}/hr`, amount: subtotal });
      break;
    case 'daily':
      subtotal = parseFloat(vehicle.base_price) * days;
      breakdown.push({ label: `${days} day(s) × ₹${vehicle.base_price}/day`, amount: subtotal });
      break;
    case 'per_km':
      if (!options.distance_km) throw ApiError.badRequest('Distance required for per-km pricing');
      subtotal = parseFloat(vehicle.base_price) * options.distance_km;
      breakdown.push({ label: `${options.distance_km} km × ₹${vehicle.base_price}/km`, amount: subtotal });
      break;
    case 'fixed':
      subtotal = parseFloat(vehicle.base_price);
      breakdown.push({ label: 'Fixed trip price', amount: subtotal });
      break;
    default:
      subtotal = parseFloat(vehicle.base_price) * days;
      breakdown.push({ label: `${days} day(s) × ₹${vehicle.base_price}/day`, amount: subtotal });
  }

  // Driver charge
  let driverCharge = 0;
  if (options.driver_required && parseFloat(vehicle.driver_charge) > 0) {
    driverCharge = parseFloat(vehicle.driver_charge) * days;
    breakdown.push({ label: `Driver × ${days} day(s)`, amount: driverCharge });
  }

  const deposit = parseFloat(vehicle.security_deposit) || 0;
  const discountAmount = 0; // Discounts can be added via coupon logic later
  const taxableAmount = subtotal + driverCharge;
  const taxAmount = Math.round(taxableAmount * TAX_RATE * 100) / 100;
  const totalAmount = taxableAmount + taxAmount - discountAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    driver_charge: Math.round(driverCharge * 100) / 100,
    discount_amount: discountAmount,
    tax_amount: taxAmount,
    service_fee: 0,
    security_deposit: deposit,
    total_amount: Math.round(totalAmount * 100) / 100,
    breakdown,
    pricing_method: vehicle.pricing_method,
    duration: { hours: Math.round(hours * 10) / 10, days },
  };
};

/**
 * Calculate price for seat-based trip booking
 */
const calculateSeatBookingPrice = async (tripId, seatIds) => {
  if (!seatIds || seatIds.length === 0) throw ApiError.badRequest('No seats selected');

  const tripResult = await query(
    'SELECT base_fare FROM trips WHERE id=$1', [tripId]
  );
  if (!tripResult.rows.length) throw ApiError.notFound('Trip not found');

  const baseFare = parseFloat(tripResult.rows[0].base_fare);

  // Get seats with their extra charge
  const seatsResult = await query(
    'SELECT id, seat_number, seat_type, extra_charge FROM seats WHERE id=ANY($1)',
    [seatIds]
  );
  if (seatsResult.rows.length !== seatIds.length) {
    throw ApiError.badRequest('One or more seat IDs are invalid');
  }

  const seatPriceMap = {};
  const breakdown = [];
  let subtotal = 0;

  for (const seat of seatsResult.rows) {
    const price = baseFare + parseFloat(seat.extra_charge || 0);
    seatPriceMap[seat.id] = price;
    subtotal += price;
    breakdown.push({
      seat_number: seat.seat_number,
      seat_type: seat.seat_type,
      base_fare: baseFare,
      extra_charge: parseFloat(seat.extra_charge || 0),
      price,
    });
  }

  const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount_amount: 0,
    tax_amount: taxAmount,
    service_fee: 0,
    security_deposit: 0,
    total_amount: totalAmount,
    seat_count: seatIds.length,
    seatPriceMap,
    breakdown,
  };
};

/**
 * Get a pricing quote (public endpoint — no booking created)
 */
const getPricingQuote = async (params) => {
  const { booking_type, vehicle_id, trip_id, seat_ids,
          pickup_datetime, return_datetime, distance_km, driver_required } = params;

  if (booking_type === 'seat_booking') {
    return calculateSeatBookingPrice(trip_id, seat_ids);
  }
  return calculateRentalPrice(vehicle_id, pickup_datetime, return_datetime, {
    distance_km, driver_required,
  });
};

module.exports = { calculateRentalPrice, calculateSeatBookingPrice, getPricingQuote };
