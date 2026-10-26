const service = require('./routes.service');
const ApiResponse = require('../../utils/ApiResponse');

const getAll = async (req, res, next) => {
  try {
    const routes = await service.getAllRoutes();
    ApiResponse.success(res, { routes });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const route = await service.getRouteById(req.params.id);
    ApiResponse.success(res, { route });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const route = await service.createRoute(req.body);
    ApiResponse.created(res, { route });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const route = await service.updateRoute(req.params.id, req.body);
    ApiResponse.success(res, { route }, 'Route updated');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update };
