const express = require('express');
const router = express.Router();
const service = require('./users.service');
const ApiResponse = require('../../utils/ApiResponse');
const { authenticate } = require('../../middleware/auth');

router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const user = await service.getProfile(req.user.id);
    ApiResponse.success(res, { user });
  } catch (err) { next(err); }
});

router.get('/booking-summary', authenticate, async (req, res, next) => {
  try {
    const summary = await service.getBookingSummary(req.user.id);
    ApiResponse.success(res, { summary });
  } catch (err) { next(err); }
});

router.get('/notifications', authenticate, async (req, res, next) => {
  try {
    const result = await service.getNotifications(req.user.id, req.query);
    ApiResponse.success(res, result);
  } catch (err) { next(err); }
});

router.patch('/notifications/:id/read', authenticate, async (req, res, next) => {
  try {
    await service.markNotificationRead(req.params.id, req.user.id);
    ApiResponse.success(res, null, 'Notification marked as read');
  } catch (err) { next(err); }
});

module.exports = router;
