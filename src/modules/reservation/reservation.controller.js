// server/modules/reservation/reservation.controller.js
const Reservation = require('./reservation.model');
const { getIO } = require('../../sockets/socketServer');

// =========================================
// CREATE RESERVATION
// =========================================
exports.createReservation = async (req, res) => {
  try {
    const { fullName, email, phone, people, date, time, notes } = req.body;

    if (!fullName || !phone || !people || !date || !time) {
      return res.status(400).json({
        success: false,
        error: 'fullName, phone, people, date and time are required',
      });
    }

    // Build 5-minute slot label: "19:00 - 19:05"
    const [h, m] = time.split(':').map(Number);
    const endMinutes = (m + 5) % 60;
    const endHour    = m + 5 >= 60 ? h + 1 : h;
    const timeSlot   = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} - ${String(endHour).padStart(2,'0')}:${String(endMinutes).padStart(2,'0')}`;

    // Block double-booking on same slot
    const conflict = await Reservation.findOne({ date, time, status: { $ne: 'cancelled' } });
    if (conflict) {
      return res.status(409).json({
        success: false,
        error: 'This time slot is already booked. Please choose another.',
      });
    }

    const reservation = await Reservation.create({
      fullName, email, phone,
      people: Number(people),
      date, time, timeSlot,
      notes: notes || '',
    });

    try {
      getIO().to('admin-room').emit('notification:newReservation', {
        _id: reservation._id,
        fullName: reservation.fullName,
        people: reservation.people,
        date: reservation.date,
        time: reservation.time,
        createdAt: reservation.createdAt,
      });
    } catch (_) { /* socket not yet initialised */ }

    res.status(201).json({ success: true, message: 'Reservation created', data: reservation });
  } catch (err) {
    console.error('createReservation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =========================================
// GET ALL RESERVATIONS — ADMIN
// =========================================
exports.getAllReservationsAdmin = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip  = (page - 1) * limit;

    const filter = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.date)   filter.date   = req.query.date;

    const search = req.query.search?.trim();
    if (search) {
      filter.$or = [
        { reservationId: { $regex: search, $options: 'i' } },
        { fullName:      { $regex: search, $options: 'i' } },
        { email:         { $regex: search, $options: 'i' } },
        { phone:         { $regex: search, $options: 'i' } },
      ];
    }

    const [reservations, total] = await Promise.all([
      Reservation.find(filter).sort({ date: 1, time: 1 }).skip(skip).limit(limit),
      Reservation.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: reservations,
      pagination: {
        total, page, limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error('getAllReservationsAdmin error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =========================================
// UPDATE RESERVATION STATUS
// =========================================
exports.updateReservationStatus = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ success: false, error: 'Reservation not found' });

    const allowed = ['fullName','email','phone','people','date','time','timeSlot','status','notes'];
    allowed.forEach(field => { if (req.body[field] !== undefined) reservation[field] = req.body[field]; });

    // Recalculate slot label if time changed
    if (req.body.time) {
      const [h, m] = req.body.time.split(':').map(Number);
      const endMinutes = (m + 5) % 60;
      const endHour    = m + 5 >= 60 ? h + 1 : h;
      reservation.timeSlot = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} - ${String(endHour).padStart(2,'0')}:${String(endMinutes).padStart(2,'0')}`;
    }

    await reservation.save();
    res.status(200).json({ success: true, message: 'Reservation updated', data: reservation });
  } catch (err) {
    console.error('updateReservationStatus error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =========================================
// DELETE RESERVATION
// =========================================
exports.deleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ success: false, error: 'Reservation not found' });
    await reservation.deleteOne();
    res.status(200).json({ success: true, message: 'Reservation deleted' });
  } catch (err) {
    console.error('deleteReservation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};