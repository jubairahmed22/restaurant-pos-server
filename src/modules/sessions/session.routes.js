const express = require('express');
const {
  createSession,
  getActiveSession,
  getActiveSessions,
  getSession,
  updateItems,
  sendToKitchen,
  updateItemStatus,
  applyDiscount,
  completeSession,
  updateSessionStatus,
  getCompletedSessions,
} = require('./session.controller');
const { protect, authorize } = require('../../middleware/auth');

const router = express.Router();

// All live (non-completed) sessions — for orders page
router.get('/active', protect, authorize('admin', 'staff'), getActiveSessions);

// Completed sessions list — admin reporting
router.get('/', protect, authorize('admin', 'staff'), getCompletedSessions);

// Get active session for a table
router.get('/table/:tableId', protect, getActiveSession);

// Get specific session
router.get('/:id', protect, getSession);

// Seat a table → create session
router.post('/', protect, authorize('admin', 'staff'), createSession);

// Mutate items on a session
router.patch('/:id/items', protect, authorize('admin', 'staff'), updateItems);

// Send to kitchen
router.patch('/:id/send-kitchen', protect, authorize('admin', 'staff'), sendToKitchen);

// Kitchen updates item status
router.patch('/:id/item-status', protect, authorize('admin', 'staff'), updateItemStatus);

// Apply discount
router.patch('/:id/discount', protect, authorize('admin', 'staff'), applyDiscount);

// Complete session (payment)
router.post('/:id/complete', protect, authorize('admin', 'staff'), completeSession);

// Update session status
router.patch('/:id/status', protect, authorize('admin', 'staff'), updateSessionStatus);

module.exports = router;
