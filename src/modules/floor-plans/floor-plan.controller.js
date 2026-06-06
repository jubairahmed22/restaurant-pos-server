const FloorPlan = require('./floor-plan.model');
const Table     = require('../tables/table.model');
const { getIO } = require('../../sockets/socketServer');

// ── GET /api/v1/floor-plans ───────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const plans = await FloorPlan.find({ isActive: true }).sort('-createdAt');

    // Attach live table counts
    const withCounts = await Promise.all(
      plans.map(async (plan) => {
        const tableCount = await Table.countDocuments({
          floorPlan: plan._id,
          isActive: true,
        });
        return { ...plan.toObject(), tableCount };
      })
    );

    res.status(200).json({ success: true, data: withCounts });
  } catch (err) { next(err); }
};

// ── POST /api/v1/floor-plans ──────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const plan = await FloorPlan.create(req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (err) { next(err); }
};

// ── GET /api/v1/floor-plans/:id ───────────────────────────
exports.getOne = async (req, res, next) => {
  try {
    const plan = await FloorPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Floor plan not found' });

    const tables = await Table.find({ floorPlan: req.params.id, isActive: true })
      .populate('currentSession', 'seatedAt partySize serverName status checkId')
      .sort('label');

    res.status(200).json({ success: true, data: { ...plan.toObject(), tables } });
  } catch (err) { next(err); }
};

// ── PUT /api/v1/floor-plans/:id ───────────────────────────
exports.update = async (req, res, next) => {
  try {
    const plan = await FloorPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: 'Floor plan not found' });
    res.status(200).json({ success: true, data: plan });
  } catch (err) { next(err); }
};

// ── DELETE /api/v1/floor-plans/:id ────────────────────────
exports.remove = async (req, res, next) => {
  try {
    await FloorPlan.findByIdAndUpdate(req.params.id, { isActive: false });
    await Table.updateMany({ floorPlan: req.params.id }, { isActive: false });
    res.status(200).json({ success: true, message: 'Floor plan removed' });
  } catch (err) { next(err); }
};

// ── POST /api/v1/floor-plans/:id/sections ─────────────────
// body: { name, label?, tableCount, naming: 'auto'|'custom', tableNames?: string[] }
exports.addSection = async (req, res, next) => {
  try {
    const { name, label, tableCount = 5, naming = 'auto', tableNames = [] } = req.body;

    const plan = await FloorPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Floor plan not found' });

    // Add section subdoc
    plan.sections.push({ name, label: label || name.substring(0, 3).toUpperCase(), tableCount });
    await plan.save();
    const addedSection = plan.sections[plan.sections.length - 1];

    // Create tables for this section (unplaced: x = -1)
    const tableData = [];
    for (let i = 1; i <= tableCount; i++) {
      const tableLabel =
        naming === 'custom' && tableNames[i - 1]
          ? tableNames[i - 1]
          : `${name} ${i}`;

      tableData.push({
        label:     tableLabel,
        section:   name,
        sectionId: addedSection._id.toString(),
        floorPlan: plan._id,
        capacity:  4,
        x:         -1,   // unplaced
        y:         -1,
        shape:     'square',
        width:     8,
        height:    8,
        isPlaced:  false,
      });
    }

    const tables = await Table.insertMany(tableData);

    getIO().to('admin-room').emit('floorPlan:sectionAdded', {
      floorPlanId: plan._id,
      section: addedSection,
    });

    res.status(201).json({ success: true, data: { section: addedSection, tables } });
  } catch (err) { next(err); }
};

// ── DELETE /api/v1/floor-plans/:id/sections/:sectionId ────
exports.removeSection = async (req, res, next) => {
  try {
    const plan = await FloorPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Floor plan not found' });

    const section = plan.sections.id(req.params.sectionId);
    if (section) plan.sections.pull(req.params.sectionId);
    await plan.save();

    await Table.updateMany(
      { floorPlan: req.params.id, sectionId: req.params.sectionId },
      { isActive: false }
    );

    res.status(200).json({ success: true, data: plan });
  } catch (err) { next(err); }
};

// ── PUT /api/v1/floor-plans/:id/layout ───────────────────
// body: { tables: [{ _id, x, y, shape, width, height, isPlaced }] }
exports.saveLayout = async (req, res, next) => {
  try {
    const { tables } = req.body;
    if (!Array.isArray(tables) || !tables.length) {
      return res.status(400).json({ success: false, message: 'tables array required' });
    }

    const ops = tables.map((t) => ({
      updateOne: {
        filter: { _id: t._id },
        update: {
          x: t.x,
          y: t.y,
          shape:    t.shape,
          width:    t.width,
          height:   t.height,
          isPlaced: t.isPlaced,
        },
      },
    }));

    await Table.bulkWrite(ops);

    getIO().to('admin-room').emit('floorPlan:layoutSaved', { floorPlanId: req.params.id });

    res.status(200).json({ success: true, message: 'Layout saved' });
  } catch (err) { next(err); }
};
