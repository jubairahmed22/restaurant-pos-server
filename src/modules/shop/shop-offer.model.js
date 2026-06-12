const mongoose = require('mongoose');

const ShopOfferSchema = new mongoose.Schema({
  title:         { type: String, required: [true, 'Offer title required'], trim: true },
  description:   { type: String, default: '' },
  bannerImage:   { type: String, default: '' },
  products:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'ShopProduct' }],
  discountType:  { type: String, enum: ['fixed', 'percentage'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  startDate:     { type: Date, default: null },
  endDate:       { type: Date, default: null },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('ShopOffer', ShopOfferSchema);
