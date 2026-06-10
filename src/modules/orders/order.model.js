const mongoose = require('mongoose');

// =========================================
// ORDER ITEM SUB-SCHEMA
// =========================================
const orderItemSchema = new mongoose.Schema(
  {
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food',
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

// =========================================
// ORDER SCHEMA
// =========================================
const OrderSchema = new mongoose.Schema(
  {
    // =========================================
    // ORDER ID
    // =========================================
    orderId: {
      type: String,
      unique: true,
      sparse: true, // ✅ nulls are ignored — no duplicate null error
      index: true,
    },

    // =========================================
    // USER — optional (guest / walk-in)
    // =========================================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    // =========================================
    // CUSTOMER INFO
    // =========================================
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    // =========================================
    // SHIPPING ADDRESS
    // =========================================
    shippingAddress: {
      type: String,
      required: true,
      trim: true,
    },

    // =========================================
    // ORDER ITEMS
    // =========================================
    items: {
      type: [orderItemSchema],
      required: true,
    },

    // =========================================
    // PRICING
    // =========================================
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    deliveryCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    // =========================================
    // PAYMENT
    // =========================================
    paymentMethod: {
      type: String,
      enum: ['cash', 'square'],
      default: 'cash',
    },

    squarePaymentId: {
      type: String,
      default: null,
    },

    // =========================================
    // PICKUP SCHEDULING
    // =========================================
    pickupDate: {
      type: String, // 'YYYY-MM-DD'
      default: null,
    },

    pickupTime: {
      type: String, // '16:45' 24-h or 'asap'
      default: null,
    },

    pickupDisplayDate: {
      type: String, // 'Tue 09'
      default: null,
    },

    pickupDisplayTime: {
      type: String, // '04:45 pm' or 'ASAP'
      default: null,
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
      index: true,
    },

    // =========================================
    // ORDER STATUS
    // =========================================
    orderStatus: {
      type: String,
      enum: [
        'placed',
        'preparing',
        'dispatched',
        'delivered',
        'cancelled',
      ],
      default: 'placed',
      index: true,
    },
  },

  // =========================================
  // TIMESTAMPS
  // =========================================
  {
    timestamps: true,
  }
);

// =========================================
// AUTO-GENERATE UNIQUE ORDER ID
// runs on pre-validate so it's ready before
// required-field checks fire
// =========================================
OrderSchema.pre('validate', async function (next) {
  if (this.isNew && !this.orderId) {
    const ts     = Date.now().toString(36).toUpperCase();                  // e.g. LX1K2M
    const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // e.g. A3BF
    this.orderId = `ORD-${ts}-${random}`;                                  // e.g. ORD-LX1K2M-A3BF
  }
  next();
});

// =========================================
// DROP GHOST INDEX ON STARTUP
// Removes the leftover orderNumber_1 index
// that causes duplicate key errors.
// Safe to keep forever — logs and moves on
// if the index no longer exists.
// =========================================
OrderSchema.on('index', () => {});

mongoose.connection.once('open', async () => {
  try {
    await mongoose.connection
      .collection('orders')
      .dropIndex('orderNumber_1');
    console.log('✅ Ghost index orderNumber_1 dropped');
  } catch {
    console.log('ℹ️  Ghost index already removed or never existed — OK');
  }
});

module.exports = mongoose.model('Order', OrderSchema);