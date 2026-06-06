const mongoose = require('mongoose');

// ── Order Item Sub-Schema ─────────────────────────────────
const sessionItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    foodRef:   { type: mongoose.Schema.Types.ObjectId, ref: 'Food', default: null },
    name:      { type: String, required: true, trim: true },
    price:     { type: Number, required: true },
    qty:       { type: Number, required: true, min: 1, default: 1 },
    notes:     { type: String, default: '' },
    course: {
      type: String,
      enum: ['drink', 'starter', 'main', 'dessert'],
      default: 'main',
    },
    status: {
      type: String,
      enum: ['ordered', 'sent', 'preparing', 'ready', 'served'],
      default: 'ordered',
    },
    guestIndex: { type: Number, default: null }, // null = unassigned in split mode
    sentAt:     { type: Date, default: null },
    servedAt:   { type: Date, default: null },
  },
  { _id: true, timestamps: false }
);

// ── Session Schema ────────────────────────────────────────
const TableSessionSchema = new mongoose.Schema(
  {
    checkId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: true,
      index: true,
    },

    tableLabel: { type: String, required: true },   // denormalised for quick display
    tableSection: { type: String, default: 'Main Floor' },

    seatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    partySize:   { type: Number, required: true, min: 1, default: 2 },
    serverName:  { type: String, default: 'Unassigned' },
    reservationRef: { type: String, default: null },

    status: {
      type: String,
      enum: ['seated', 'ordering', 'waiting', 'ready-to-pay'],
      default: 'seated',
      index: true,
    },

    orderItems: { type: [sessionItemSchema], default: [] },

    // Financials
    subtotal:      { type: Number, default: 0 },
    discountValue: { type: Number, default: 0 },
    discountType:  { type: String, enum: ['pct', 'fixed'], default: 'pct' },
    discountReason:{ type: String, default: '' },
    serviceCharge: { type: Number, default: 0 },
    tax:           { type: Number, default: 0 },
    total:         { type: Number, default: 0 },

    // Payment
    paymentMethod:  { type: String, enum: ['cash', 'card', 'split', ''], default: '' },
    paymentStatus:  { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    paidAt:         { type: Date, default: null },

    // Session lifecycle
    isCompleted:  { type: Boolean, default: false, index: true },
    completedAt:  { type: Date, default: null },
    durationMins: { type: Number, default: null }, // stored on completion

    // Split bill tracking
    splitMode: { type: Boolean, default: false },
    guestCount: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// Auto-generate checkId
TableSessionSchema.pre('validate', async function (next) {
  if (this.isNew && !this.checkId) {
    const ts     = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.checkId = `CHK-${ts}-${random}`;
  }
  next();
});

// Recalculate totals before save
TableSessionSchema.pre('save', function (next) {
  const sub = this.orderItems.reduce((s, i) => s + i.price * i.qty, 0);
  const disc = this.discountType === 'pct'
    ? sub * (this.discountValue / 100)
    : Math.min(this.discountValue, sub);
  const afterDisc = sub - disc;
  this.subtotal      = parseFloat(sub.toFixed(2));
  this.serviceCharge = parseFloat((afterDisc * 0.18).toFixed(2));
  this.tax           = parseFloat((afterDisc * 0.095).toFixed(2));
  this.total         = parseFloat((afterDisc + this.serviceCharge + this.tax).toFixed(2));
  next();
});

module.exports = mongoose.model('TableSession', TableSessionSchema);
