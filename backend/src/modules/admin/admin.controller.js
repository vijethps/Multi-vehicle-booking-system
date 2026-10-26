const service = require('./admin.service');
const bookingsService = require('../bookings/bookings.service');
const ApiResponse = require('../../utils/ApiResponse');

const getDashboard = async (req, res, next) => {
  try {
    const stats = await service.getDashboardStats();
    ApiResponse.success(res, stats);
  } catch (err) { next(err); }
};

const getRevenue = async (req, res, next) => {
  try {
    const report = await service.getRevenueReport(req.query);
    ApiResponse.success(res, report);
  } catch (err) { next(err); }
};

const getFleet = async (req, res, next) => {
  try {
    const report = await service.getFleetReport(req.query);
    ApiResponse.success(res, { vehicles: report });
  } catch (err) { next(err); }
};

const getBookings = async (req, res, next) => {
  try {
    const result = await bookingsService.getAllBookings(req.query);
    ApiResponse.paginated(res, result.bookings, result.pagination);
  } catch (err) { next(err); }
};

const getBookingDetail = async (req, res, next) => {
  try {
    const booking = await bookingsService.getBookingById(req.params.id, req.user.id, req.user.role);
    ApiResponse.success(res, { booking });
  } catch (err) { next(err); }
};

const confirmBooking = async (req, res, next) => {
  try {
    const result = await service.confirmBooking(req.params.id, req.user.id);
    ApiResponse.success(res, result, 'Booking confirmed');
  } catch (err) { next(err); }
};

const processRefund = async (req, res, next) => {
  try {
    const result = await service.adminProcessRefund(req.params.id, req.user.id);
    ApiResponse.success(res, { refund: result }, 'Refund processed');
  } catch (err) { next(err); }
};

const getUsers = async (req, res, next) => {
  try {
    const result = await service.getUsers(req.query);
    ApiResponse.success(res, result);
  } catch (err) { next(err); }
};

const toggleUser = async (req, res, next) => {
  try {
    const user = await service.toggleUserStatus(req.params.id, req.body.is_active);
    ApiResponse.success(res, { user }, 'User status updated');
  } catch (err) { next(err); }
};

module.exports = {
  getDashboard, getRevenue, getFleet,
  getBookings, getBookingDetail, confirmBooking, processRefund,
  getUsers, toggleUser,
};
