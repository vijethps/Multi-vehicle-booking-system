const express = require('express');
const router = express.Router();
const ctrl = require('./vehicles.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { body, param, query } = require('express-validator');
const validate = require('../../middleware/validate');
const multer = require('multer');
const path = require('path');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./vehicles.service');

// Multer disk storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `vehicle-${req.params.id}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Public routes
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.get('/:id/availability', ctrl.checkAvailability);

// Admin routes
router.post(
  '/',
  authenticate,
  authorize('admin', 'fleet_manager'),
  [
    body('category_id').isInt().withMessage('Category ID required'),
    body('name').trim().notEmpty().withMessage('Vehicle name required'),
    body('base_price').isNumeric().withMessage('Base price required'),
  ],
  validate,
  ctrl.create
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'fleet_manager'),
  ctrl.update
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('admin', 'fleet_manager'),
  [body('is_active').isBoolean()],
  validate,
  ctrl.updateStatus
);

// Add image by URL
router.post(
  '/:id/images',
  authenticate,
  authorize('admin', 'fleet_manager'),
  [body('url').notEmpty().withMessage('Image URL required')],
  validate,
  ctrl.addImage
);

// Upload image file (multer)
router.post(
  '/:id/images/upload',
  authenticate,
  authorize('admin', 'fleet_manager'),
  upload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file provided' });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      const isPrimary = req.body.is_primary === 'true';
      const image = await service.addVehicleImage(req.params.id, {
        url: imageUrl,
        alt_text: req.body.alt_text || req.file.originalname,
        is_primary: isPrimary,
        sort_order: parseInt(req.body.sort_order) || 0,
      });
      ApiResponse.created(res, { image, url: imageUrl }, 'Image uploaded successfully');
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
