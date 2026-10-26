const service = require('./trips.service');
const ApiResponse = require('../../utils/ApiResponse');

const getAll = async (req, res, next) => {
  try {
    const result = await service.getTrips(req.query);
    ApiResponse.paginated(res, result.trips, result.pagination);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const trip = await service.getTripById(req.params.id);
    ApiResponse.success(res, { trip });
  } catch (err) { next(err); }
};

const getSeats = async (req, res, next) => {
  try {
    const seats = await service.getTripSeats(req.params.id);
    ApiResponse.success(res, { seats });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const trip = await service.createTrip(req.body, req.user.id);
    ApiResponse.created(res, { trip });
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const trip = await service.updateTripStatus(req.params.id, req.body.status);
    ApiResponse.success(res, { trip }, 'Trip status updated');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, getSeats, create, updateStatus };
