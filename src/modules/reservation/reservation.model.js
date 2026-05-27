// server/modules/reservation/reservation.model.js
const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema(
  {
    reservationId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    email:    { type: String, trim: true, lowercase: true, default: '' },
    phone:    { type: String, required: true, trim: true },
    people:   { type: Number, required: true, min: 1, max: 20 },
    date:     { type: String, required: true },   // "YYYY-MM-DD"
    timeSlot: { type: String, required: true },   // "19:00 - 19:05"  (5-min slot label)
    time:     { type: String, required: true },   // "19:00" (raw start time)
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
      index: true,
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto-generate a human-readable ID
ReservationSchema.pre('validate', async function (next) {
  if (this.isNew && !this.reservationId) {
    const ts     = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.reservationId = `RES-${ts}-${random}`;
  }
  next();
});

module.exports = mongoose.model('Reservation', ReservationSchema);