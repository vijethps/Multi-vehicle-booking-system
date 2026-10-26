const service = require('./categories.service');
const ApiResponse = require('../../utils/ApiResponse');

const getAll = async (req, res, next) => {
  try {
    const categories = await service.getAllCategories();
    ApiResponse.success(res, { categories });
  } catch (err) { next(err); }
};

const getBySlug = async (req, res, next) => {
  try {
    const category = await service.getCategoryBySlug(req.params.slug);
    ApiResponse.success(res, { category });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const category = await service.createCategory(req.body);
    ApiResponse.created(res, { category });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const category = await service.updateCategory(req.params.id, req.body);
    ApiResponse.success(res, { category }, 'Category updated');
  } catch (err) { next(err); }
};

const getTypes = async (req, res, next) => {
  try {
    const types = await service.getVehicleTypes(req.params.id);
    ApiResponse.success(res, { types });
  } catch (err) { next(err); }
};

module.exports = { getAll, getBySlug, create, update, getTypes };
