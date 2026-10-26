const express = require('express');
const router = express.Router();
const ctrl = require('./routes.controller');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authenticate, authorize('admin', 'fleet_manager'), ctrl.create);
router.put('/:id', authenticate, authorize('admin', 'fleet_manager'), ctrl.update);

module.exports = router;
