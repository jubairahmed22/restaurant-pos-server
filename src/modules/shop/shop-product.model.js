const mongoose = require('mongoose');

const SpecificationSchema = new mongoose.Schema(
  { key: String, value: String },
  { _id: false }
);

const ShopProductSchema = new mongoose.Schema({
  title:            { type: String, required: [true, 'Title required'], trim: true },
  slug:             { type: String, unique: true, lowercase: true },
  shortDescription: { type: String, default: '' },
  description:      { type: String, default: '' },
  category:         { type: mongoose.Schema.Types.ObjectId, ref: 'ShopCategory', default: null },
  images:           [{ type: String }],
  price:            { type: Number, required: [true, 'Price required'], min: 0 },
  comparePrice:     { type: Number, default: 0 },
  sku:              { type: String, default: '' },
  stock:            { type: Number, default: 0 },
  discountType:     { type: String, enum: ['none', 'fixed', 'percentage'], default: 'none' },
  discountValue:    { type: Number, default: 0 },
  discountEndDate:  { type: Date, default: null },
  isFeatured:       { type: Boolean, default: false },
  isActive:         { type: Boolean, default: true },
  brand:            { type: String, default: '' },
  weight:           { type: String, default: '' },
  dimensions:       { type: String, default: '' },
  specifications:   [SpecificationSchema],
  tags:             [{ type: String }],
  seoTitle:         { type: String, default: '' },
  seoDescription:   { type: String, default: '' },
  seoKeywords:      { type: String, default: '' },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

ShopProductSchema.pre('save', function (next) {
  if (this.title) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  next();
});

ShopProductSchema.virtual('finalPrice').get(function () {
  if (this.discountType === 'fixed') return Math.max(0, this.price - this.discountValue);
  if (this.discountType === 'percentage') return Math.max(0, this.price * (1 - this.discountValue / 100));
  return this.price;
});

ShopProductSchema.virtual('discountPercent').get(function () {
  if (this.discountType === 'fixed' && this.price > 0) return Math.round((this.discountValue / this.price) * 100);
  if (this.discountType === 'percentage') return this.discountValue;
  return 0;
});

module.exports = mongoose.model('ShopProduct', ShopProductSchema);
