const express = require('express');
const router = express.Router();
const ctrl = require('./categories.controller');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', ctrl.getAll);
router.get('/:slug', ctrl.getBySlug);
router.get('/:id/types', ctrl.getTypes);
router.post('/', authenticate, authorize('admin'), ctrl.create);
router.put('/:id', authenticate, authorize('admin'), ctrl.update);

module.exports = router;
