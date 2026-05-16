const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, default: () => 'ORD-' + Math.floor(100000 + Math.random() * 900000) },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
    title: String,
    price: Number,
    quantity: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  deliveryCharge: { type: Number, default: 50 },
  total: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  orderStatus: { type: String, enum: ['placed', 'preparing', 'dispatched', 'delivered', 'cancelled'], default: 'placed' },
  stripePaymentIntentId: String,
  shippingAddress: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);