const service = require('./bookings.service');
const pricingService = require('./pricing.service');
const ApiResponse = require('../../utils/ApiResponse');

const create = async (req, res, next) => {
  try {
    const booking = await service.createBooking(req.user.id, req.body);
    ApiResponse.created(res, { booking }, 'Booking created successfully');
  } catch (err) { next(err); }
};

const getMyBookings = async (req, res, next) => {
  try {
    const result = await service.getMyBookings(req.user.id, req.query);
    ApiResponse.paginated(res, result.bookings, result.pagination);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const booking = await service.getBookingById(req.params.id, req.user.id, req.user.role);
    ApiResponse.success(res, { booking });
  } catch (err) { next(err); }
};

const cancel = async (req, res, next) => {
  try {
    const result = await service.cancelBooking(
      req.params.id, req.user.id, req.user.role, req.body.reason
    );
    ApiResponse.success(res, result, 'Booking cancelled');
  } catch (err) { next(err); }
};

const getPricingQuote = async (req, res, next) => {
  try {
    const pricing = await pricingService.getPricingQuote(req.body);
    ApiResponse.success(res, { pricing });
  } catch (err) { next(err); }
};

module.exports = { create, getMyBookings, getById, cancel, getPricingQuote };
