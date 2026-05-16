const express = require('express');
const { createOrder, processStripePayment, confirmPaymentSuccess, getMyOrders, getAllOrdersAdmin, updateOrderStatus } = require('./order.controller');
const { protect, authorize } = require('../../middleware/auth');

const router = express.Router();

router.route('/')
  .post(protect, createOrder)
  .get(protect, getMyOrders);

router.get('/admin', protect, authorize('admin', 'staff'), getAllOrdersAdmin);
router.put('/:id/status', protect, authorize('admin', 'staff'), updateOrderStatus);
router.post('/payment-intent', protect, processStripePayment);
router.post('/confirm-payment', protect, confirmPaymentSuccess);

module.exports = router;