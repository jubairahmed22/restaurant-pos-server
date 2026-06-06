const Table = require('./table.model');
const { getIO } = require('../../sockets/socketServer');

// GET /api/v1/tables
exports.getAllTables = async (req, res, next) => {
  try {
    const tables = await Table.find({ isActive: true })
      .populate('currentSession', 'seatedAt partySize serverName status checkId')
      .sort('label');

    res.set('Cache-Control', 'no-store'); // always live
    res.status(200).json({ success: true, data: tables });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/tables/:id
exports.getTable = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id)
      .populate('currentSession');

    if (!table) return res.status(404).json({ success: false, message: 'Table not found' });

    res.status(200).json({ success: true, data: table });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/tables
exports.createTable = async (req, res, next) => {
  try {
    const table = await Table.create(req.body);

    getIO().to('admin-room').emit('table:created', table);

    res.status(201).json({ success: true, data: table });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/tables/:id
exports.updateTable = async (req, res, next) => {
  try {
    const table = await Table.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!table) return res.status(404).json({ success: false, message: 'Table not found' });

    getIO().to('admin-room').emit('table:updated', table);

    res.status(200).json({ success: true, data: table });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/tables/:id/status
exports.updateTableStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const table = await Table.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('currentSession', 'seatedAt partySize serverName status');

    if (!table) return res.status(404).json({ success: false, message: 'Table not found' });

    // Broadcast to all connected clients
    getIO().to('admin-room').emit('table:statusChanged', {
      tableId: table._id,
      label: table.label,
      status: table.status,
    });

    res.status(200).json({ success: true, data: table });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/tables/:id
exports.deleteTable = async (req, res, next) => {
  try {
    const table = await Table.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!table) return res.status(404).json({ success: false, message: 'Table not found' });

    getIO().to('admin-room').emit('table:deleted', { tableId: req.params.id });

    res.status(200).json({ success: true, message: 'Table deactivated' });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/tables/seed — seed default floor plan (dev helper)
exports.seedTables = async (req, res, next) => {
  try {
    const existing = await Table.countDocuments();
    if (existing > 0) {
      return res.status(200).json({ success: true, message: 'Tables already seeded', count: existing });
    }

    const defaults = [
      // Main Floor — squares
      { label: 'T1', section: 'Main Floor', capacity: 4, x: 12, y: 12, shape: 'rectangle' },
      { label: 'T2', section: 'Main Floor', capacity: 2, x: 28, y: 12, shape: 'square' },
      { label: 'T3', section: 'Main Floor', capacity: 2, x: 40, y: 12, shape: 'square' },
      { label: 'T4', section: 'Main Floor', capacity: 4, x: 84, y: 12, shape: 'square' },
      { label: 'T5', section: 'Main Floor', capacity: 6, x: 84, y: 26, shape: 'square', status: 'ready-to-pay' },
      { label: 'T6', section: 'Main Floor', capacity: 4, x: 84, y: 45, shape: 'square' },
      { label: 'T7', section: 'Main Floor', capacity: 4, x: 84, y: 60, shape: 'square' },
      { label: 'T8', section: 'Main Floor', capacity: 2, x: 84, y: 74, shape: 'square' },
      { label: 'T9', section: 'Main Floor', capacity: 4, x: 40, y: 40, shape: 'square' },
      { label: 'T10', section: 'Main Floor', capacity: 4, x: 54, y: 40, shape: 'square' },
      { label: 'T11', section: 'Main Floor', capacity: 4, x: 68, y: 40, shape: 'square' },
      { label: 'T12', section: 'Main Floor', capacity: 4, x: 40, y: 56, shape: 'square' },
      { label: 'T13', section: 'Main Floor', capacity: 4, x: 54, y: 56, shape: 'square' },
      { label: 'T14', section: 'Main Floor', capacity: 4, x: 68, y: 56, shape: 'square' },
      // Bar — circles
      { label: 'B1', section: 'Bar', capacity: 2, x: 10, y: 70, shape: 'circle' },
      { label: 'B2', section: 'Bar', capacity: 2, x: 22, y: 70, shape: 'circle' },
      { label: 'B3', section: 'Bar', capacity: 2, x: 34, y: 70, shape: 'circle' },
      { label: 'B4', section: 'Bar', capacity: 2, x: 22, y: 54, shape: 'circle' },
      { label: 'B5', section: 'Bar', capacity: 2, x: 22, y: 38, shape: 'circle', status: 'seated' },
      { label: 'B6', section: 'Bar', capacity: 2, x: 22, y: 46, shape: 'circle', status: 'ordering' },
      { label: 'B7', section: 'Bar', capacity: 2, x: 22, y: 62, shape: 'circle' },
      { label: 'B8', section: 'Bar', capacity: 2, x: 34, y: 84, shape: 'circle' },
      { label: 'B9', section: 'Bar', capacity: 2, x: 22, y: 84, shape: 'circle' },
      { label: 'B10', section: 'Bar', capacity: 2, x: 10, y: 84, shape: 'circle' },
    ];

    const tables = await Table.insertMany(defaults);
    res.status(201).json({ success: true, message: 'Floor plan seeded', count: tables.length });
  } catch (err) {
    next(err);
  }
};
