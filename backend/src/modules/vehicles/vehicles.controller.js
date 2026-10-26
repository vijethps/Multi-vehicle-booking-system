const service = require('./vehicles.service');
const ApiResponse = require('../../utils/ApiResponse');

const getAll = async (req, res, next) => {
  try {
    const result = await service.getVehicles(req.query);
    ApiResponse.paginated(res, result.vehicles, result.pagination);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const vehicle = await service.getVehicleById(req.params.id);
    ApiResponse.success(res, { vehicle });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const vehicle = await service.createVehicle(req.body);
    ApiResponse.created(res, { vehicle });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const vehicle = await service.updateVehicle(req.params.id, req.body);
    ApiResponse.success(res, { vehicle }, 'Vehicle updated');
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const vehicle = await service.updateStatus(req.params.id, req.body.is_active);
    ApiResponse.success(res, { vehicle }, 'Vehicle status updated');
  } catch (err) { next(err); }
};

const checkAvailability = async (req, res, next) => {
  try {
    const { pickup_datetime, return_datetime } = req.query;
    const result = await service.checkAvailability(
      req.params.id, pickup_datetime, return_datetime
    );
    ApiResponse.success(res, result);
  } catch (err) { next(err); }
};

const addImage = async (req, res, next) => {
  try {
    const image = await service.addVehicleImage(req.params.id, req.body);
    ApiResponse.created(res, { image });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, updateStatus, checkAvailability, addImage };
