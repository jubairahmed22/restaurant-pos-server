// server/modules/reservation/reservation.routes.js
const express = require('express');
const {
  createReservation,
  getAllReservationsAdmin,
  updateReservationStatus,
  deleteReservation,
} = require('./reservation.controller');
const { protect, authorize } = require('../../middleware/auth');

const router = express.Router();

// PUBLIC — anyone can book (no auth required for walk-ins)
router.post('/', createReservation);

// ADMIN
router.get('/admin', protect, authorize('admin', 'staff'), getAllReservationsAdmin);
router.put('/:id', protect, authorize('admin', 'staff'), updateReservationStatus);
router.delete('/:id', protect, authorize('admin', 'staff'), deleteReservation);

module.exports = router;