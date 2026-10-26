const service = require('./seats.service');
const ApiResponse = require('../../utils/ApiResponse');

const getLayouts = async (req, res, next) => {
  try {
    const layouts = await service.getSeatLayouts();
    ApiResponse.success(res, { layouts });
  } catch (err) { next(err); }
};

const getLayout = async (req, res, next) => {
  try {
    const data = await service.getLayoutWithSeats(req.params.id);
    ApiResponse.success(res, data);
  } catch (err) { next(err); }
};

const createLayout = async (req, res, next) => {
  try {
    const data = await service.createLayout(req.body);
    ApiResponse.created(res, data);
  } catch (err) { next(err); }
};

const holdSeats = async (req, res, next) => {
  try {
    const { trip_id, seat_ids } = req.body;
    const result = await service.holdSeats(trip_id, seat_ids, req.user.id);
    ApiResponse.success(res, result, 'Seats held successfully');
  } catch (err) { next(err); }
};

const releaseHolds = async (req, res, next) => {
  try {
    const { trip_id, seat_ids } = req.body;
    await service.releaseHolds(trip_id, seat_ids, req.user.id);
    ApiResponse.success(res, null, 'Holds released');
  } catch (err) { next(err); }
};

module.exports = { getLayouts, getLayout, createLayout, holdSeats, releaseHolds };
