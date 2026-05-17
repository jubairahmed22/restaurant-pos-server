const express = require('express');
const {
  createOrder,
  getMyOrders,
  getAllOrdersAdmin,
  updateOrderStatus,
} = require('./order.controller');
const { protect, authorize } = require('../../middleware/auth');

const router = express.Router();

// Customer routes
router.route('/')
  .post(protect, createOrder)      // Place a new cash order
  .get(protect, getMyOrders);      // Get own order history

// Admin / Staff routes
router.get('/admin', protect, authorize('admin', 'staff'), getAllOrdersAdmin);
router.put('/:id/status', protect, authorize('admin', 'staff'), updateOrderStatus);

module.exports = router;