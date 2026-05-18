const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    // =========================================
    // ORDER ID
    // =========================================
    orderId: {
      type: String,
      unique: true,
      index: true,
      default: () =>
        'ORD-' + Math.floor(100000 + Math.random() * 900000),
    },

    // =========================================
    // USER
    // =========================================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    // ORDER ITEMS
    // =========================================
    items: [
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
    ],

    // =========================================
    // PRICE
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
      enum: ['cash'],
      default: 'cash',
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

    // =========================================
    // SHIPPING ADDRESS
    // =========================================
    shippingAddress: {
      type: String,
      required: true,
      trim: true,
    },
  },

  // =========================================
  // TIMESTAMPS
  // =========================================
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', OrderSchema);