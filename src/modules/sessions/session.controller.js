const TableSession = require('./session.model');
const Table        = require('../tables/table.model');
const { getIO }    = require('../../sockets/socketServer');

// ── helpers ───────────────────────────────────────────────
const emitSessionUpdate = (session) => {
  try {
    getIO().to('admin-room').emit('session:updated', {
      tableId: session.table,
      tableLabel: session.tableLabel,
      sessionId: session._id,
      checkId: session.checkId,
      status: session.status,
      orderItems: session.orderItems,
      total: session.total,
    });
  } catch {}
};

// ── POST /api/v1/sessions — create / seat a table ─────────
exports.createSession = async (req, res, next) => {
  try {
    const { tableId, partySize, serverName, reservationRef, guestCount } = req.body;

    const table = await Table.findById(tableId);
    if (!table) return res.status(404).json({ success: false, message: 'Table not found' });
    if (table.status !== 'empty' && table.status !== 'needs-cleaning') {
      return res.status(400).json({ success: false, message: 'Table is not available' });
    }

    const session = await TableSession.create({
      table: tableId,
      tableLabel: table.label,
      tableSection: table.section,
      partySize: partySize || 2,
      serverName: serverName || 'Staff',
      reservationRef: reservationRef || null,
      guestCount: guestCount || partySize || 2,
      status: 'seated',
    });

    // Update table status
    table.status = 'seated';
    table.currentSession = session._id;
    await table.save();

    getIO().to('admin-room').emit('table:statusChanged', {
      tableId: table._id,
      label: table.label,
      status: 'seated',
      sessionId: session._id,
    });

    res.status(201).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/sessions/table/:tableId — active session for table
exports.getActiveSession = async (req, res, next) => {
  try {
    const session = await TableSession.findOne({
      table: req.params.tableId,
      isCompleted: false,
    });

    if (!session) return res.status(404).json({ success: false, message: 'No active session' });

    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/sessions/:id — get session by id
exports.getSession = async (req, res, next) => {
  try {
    const session = await TableSession.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/v1/sessions/:id/items — add / update / remove item
exports.updateItems = async (req, res, next) => {
  try {
    const { action, item } = req.body;
    // action: 'add' | 'update' | 'remove'
    const session = await TableSession.findOne({ _id: req.params.id, isCompleted: false });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    if (action === 'add') {
      // Strip the client-side tmp _id so Mongoose auto-generates a real ObjectId
      const { _id: _tmpId, id: _id2, ...itemData } = item;
      session.orderItems.push(itemData);
    } else if (action === 'update') {
      const idx = session.orderItems.findIndex(i => i._id.toString() === item.id);
      if (idx !== -1) Object.assign(session.orderItems[idx], item.updates);
    } else if (action === 'remove') {
      session.orderItems = session.orderItems.filter(i => i._id.toString() !== item.id);
    }

    session.status = 'ordering';
    await session.save();

    // update table status
    await Table.findByIdAndUpdate(session.table, { status: 'ordering' });

    emitSessionUpdate(session);

    res.status(200).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/v1/sessions/:id/send-kitchen — mark items as sent
exports.sendToKitchen = async (req, res, next) => {
  try {
    const { itemIds } = req.body; // array of item _id strings
    const session = await TableSession.findOne({ _id: req.params.id, isCompleted: false });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const now = new Date();
    session.orderItems.forEach(item => {
      if (itemIds.includes(item._id.toString()) && item.status === 'ordered') {
        item.status = 'sent';
        item.sentAt = now;
      }
    });
    session.status = 'waiting';
    await session.save();

    await Table.findByIdAndUpdate(session.table, { status: 'waiting' });

    // Broadcast to kitchen room
    getIO().to('kitchen-room').emit('kitchen:newTicket', {
      tableLabel: session.tableLabel,
      checkId: session.checkId,
      items: session.orderItems.filter(i => itemIds.includes(i._id.toString())),
      sentAt: now,
    });

    emitSessionUpdate(session);
    res.status(200).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/v1/sessions/:id/item-status — kitchen updates item status
exports.updateItemStatus = async (req, res, next) => {
  try {
    const { itemId, status } = req.body;
    const session = await TableSession.findOne({ _id: req.params.id, isCompleted: false });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const item = session.orderItems.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    item.status = status;
    if (status === 'served') item.servedAt = new Date();

    // If all sent items are served → ready-to-pay
    const allServed = session.orderItems
      .filter(i => i.status !== 'ordered')
      .every(i => i.status === 'served');
    if (allServed && session.orderItems.length > 0) session.status = 'ready-to-pay';

    await session.save();
    emitSessionUpdate(session);
    res.status(200).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/v1/sessions/:id/discount — apply discount
exports.applyDiscount = async (req, res, next) => {
  try {
    const { discountValue, discountType, discountReason } = req.body;
    const session = await TableSession.findOne({ _id: req.params.id, isCompleted: false });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    session.discountValue  = discountValue  ?? session.discountValue;
    session.discountType   = discountType   ?? session.discountType;
    session.discountReason = discountReason ?? session.discountReason;
    await session.save();

    res.status(200).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/sessions/:id/complete — payment + close session
exports.completeSession = async (req, res, next) => {
  try {
    const { paymentMethod } = req.body;
    const session = await TableSession.findOne({ _id: req.params.id, isCompleted: false });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const now = new Date();
    const durationMins = Math.round((now - session.seatedAt) / 60000);

    session.paymentMethod  = paymentMethod || 'cash';
    session.paymentStatus  = 'paid';
    session.paidAt         = now;
    session.isCompleted    = true;
    session.completedAt    = now;
    session.durationMins   = durationMins;
    await session.save();

    // Free the table
    await Table.findByIdAndUpdate(session.table, {
      status: 'needs-cleaning',
      currentSession: null,
    });

    getIO().to('admin-room').emit('table:statusChanged', {
      tableId: session.table,
      label: session.tableLabel,
      status: 'needs-cleaning',
    });
    getIO().to('admin-room').emit('session:completed', {
      sessionId: session._id,
      checkId: session.checkId,
      tableLabel: session.tableLabel,
      total: session.total,
      durationMins,
    });

    res.status(200).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/v1/sessions/:id/status — update session status
exports.updateSessionStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const session = await TableSession.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    await Table.findByIdAndUpdate(session.table, { status });
    emitSessionUpdate(session);

    res.status(200).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/sessions/active — all live (non-completed) sessions
exports.getActiveSessions = async (req, res, next) => {
  try {
    const sessions = await TableSession.find({ isCompleted: false })
      .sort({ seatedAt: -1 });
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/sessions — completed sessions for reporting
exports.getCompletedSessions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const filter = { isCompleted: true };

    if (startDate || endDate) {
      filter.completedAt = {};
      if (startDate) filter.completedAt.$gte = new Date(startDate);
      if (endDate)   filter.completedAt.$lte = new Date(endDate);
    }

    const [sessions, total] = await Promise.all([
      TableSession.find(filter)
        .sort({ completedAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      TableSession.countDocuments(filter),
    ]);

    res.set('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(200).json({
      success: true,
      data: sessions,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
};
