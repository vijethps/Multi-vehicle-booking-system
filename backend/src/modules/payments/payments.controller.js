const service = require('./payments.service');
const ApiResponse = require('../../utils/ApiResponse');

const createOrder = async (req, res, next) => {
  try {
    const result = await service.createOrder(req.body.booking_id, req.user.id);
    ApiResponse.success(res, result, 'Payment order created');
  } catch (err) { next(err); }
};

const verifyPayment = async (req, res, next) => {
  try {
    const result = await service.verifyPayment(req.body);
    ApiResponse.success(res, result, 'Payment verified');
  } catch (err) { next(err); }
};

const webhook = async (req, res, next) => {
  // Razorpay webhook handler
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);
    const crypto = require('crypto');

    if (process.env.RAZORPAY_WEBHOOK_SECRET && signature) {
      const expectedSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');
      if (expectedSig !== signature) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    if (event === 'payment.captured') {
      const payment = req.body.payload.payment.entity;
      await service.verifyPayment({
        gateway_order_id: payment.order_id,
        gateway_payment_id: payment.id,
        payment_method: payment.method,
      });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const history = await service.getPaymentHistory(
      req.params.bookingId, req.user.id, req.user.role
    );
    ApiResponse.success(res, { payments: history });
  } catch (err) { next(err); }
};

module.exports = { createOrder, verifyPayment, webhook, getHistory };
