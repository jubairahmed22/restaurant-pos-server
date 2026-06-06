const express = require('express');
const {
  getAllTables,
  getTable,
  createTable,
  updateTable,
  updateTableStatus,
  deleteTable,
  seedTables,
} = require('./table.controller');
const { protect, authorize } = require('../../middleware/auth');

const router = express.Router();

// Public (staff need to see floor plan without heavy auth check)
router.get('/', protect, getAllTables);
router.get('/:id', protect, getTable);

// Admin / Staff mutations
router.post('/', protect, authorize('admin', 'staff'), createTable);
router.put('/:id', protect, authorize('admin', 'staff'), updateTable);
router.patch('/:id/status', protect, authorize('admin', 'staff'), updateTableStatus);
router.delete('/:id', protect, authorize('admin'), deleteTable);

// Dev helper
router.post('/seed', protect, authorize('admin'), seedTables);

module.exports = router;
