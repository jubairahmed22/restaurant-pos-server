const express = require('express');

const {
  createOrder,
  getMyOrders,
  getAllOrdersAdmin,
  updateOrderStatus,
  deleteOrder,
} = require('./order.controller');

const {
  protect,
  authorize,
} = require('../../middleware/auth');

const router = express.Router();

// CUSTOMER
router
  .route('/')
  .post(protect, createOrder)
  .get(protect, getMyOrders);

// ADMIN
router.get(
  '/admin',
  protect,
  authorize('admin', 'staff'),
  getAllOrdersAdmin
);

// UPDATE
router.put(
  '/:id/status',
  protect,
  authorize('admin', 'staff'),
  updateOrderStatus
);

// DELETE
router.delete(
  '/:id',
  protect,
  authorize('admin', 'staff'),
  deleteOrder
);

module.exports = router;