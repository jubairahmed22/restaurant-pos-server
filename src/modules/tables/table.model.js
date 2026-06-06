const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, 'Table label required'],
      trim: true,
      // e.g. "T1", "B3"
    },

    section: {
      type: String,
      required: [true, 'Section required'],
      trim: true,
      default: 'Main Floor',
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
      default: 4,
    },

    // Floor plan reference (null = legacy / seeded tables)
    floorPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FloorPlan',
      default: null,
      index: true,
    },

    // Section sub-document id (string)
    sectionId: { type: String, default: null },

    // Canvas position — percentage 0-100 (-1 = unplaced)
    x: { type: Number, default: 10 },
    y: { type: Number, default: 10 },

    // Size in grid units (1 unit = 40px virtual)
    width:  { type: Number, default: 8, min: 1 },
    height: { type: Number, default: 8, min: 1 },

    // Has been dragged onto the canvas?
    isPlaced: { type: Boolean, default: true },

    shape: {
      type: String,
      enum: ['circle', 'square', 'rectangle'],
      default: 'square',
    },

    status: {
      type: String,
      enum: ['empty', 'seated', 'ordering', 'waiting', 'ready-to-pay', 'needs-cleaning'],
      default: 'empty',
      index: true,
    },

    // Reference to active session (null when empty)
    currentSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TableSession',
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Table', TableSchema);
