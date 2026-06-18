const mongoose = require('mongoose');

const ShopOrderItemSchema = new mongoose.Schema({
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'ShopProduct', default: null },
  title:    { type: String, required: true },
  price:    { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image:    { type: String, default: '' },
}, { _id: false });

const ShopOrderSchema = new mongoose.Schema({
  orderId:         { type: String, unique: true, sparse: true },
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  fullName:        { type: String, required: true },
  email:           { type: String, default: '' },
  phone:           { type: String, default: '' },
  shippingAddress: { type: String, default: '' },
  items:           [ShopOrderItemSchema],
  subtotal:        { type: Number, required: true },
  deliveryCharge:  { type: Number, default: 0 },
  total:           { type: Number, required: true },
  paymentMethod:   { type: String, enum: ['cash', 'square'], default: 'cash' },
  paymentStatus:   { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  squarePaymentId: { type: String, default: '' },
  orderStatus:     { type: String, enum: ['placed', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'placed' },
  attribution: {
    source:      { type: String, default: 'direct' },
    medium:      { type: String, default: '' },
    campaign:    { type: String, default: '' },
    referrer:    { type: String, default: '' },
    landingPage: { type: String, default: '' },
  },
}, { timestamps: true });

ShopOrderSchema.pre('validate', function (next) {
  if (!this.orderId) {
    const ts   = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.orderId = `ORD-SHOP-${ts}-${rand}`;
  }
  next();
});

module.exports = mongoose.model('ShopOrder', ShopOrderSchema);
