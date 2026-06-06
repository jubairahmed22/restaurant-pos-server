const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true },
    label:      { type: String, trim: true },          // short prefix, e.g. "DR"
    tableCount: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const FloorPlanSchema = new mongoose.Schema(
  {
    name:     { type: String, required: [true, 'Floor plan name required'], trim: true },
    location: { type: String, default: 'Main Location', trim: true },
    sections: [SectionSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FloorPlan', FloorPlanSchema);
