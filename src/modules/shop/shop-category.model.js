const mongoose = require('mongoose');

const ShopCategorySchema = new mongoose.Schema({
  name:           { type: String, required: [true, 'Category name required'], trim: true },
  slug:           { type: String, unique: true, lowercase: true },
  description:    { type: String, default: '' },
  image:          { type: String, default: '' },
  seoTitle:       { type: String, default: '' },
  seoDescription: { type: String, default: '' },
  seoKeywords:    { type: String, default: '' },
  isActive:       { type: Boolean, default: true },
  sortOrder:      { type: Number, default: 0 },
}, { timestamps: true });

ShopCategorySchema.pre('save', function (next) {
  if (this.name) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  next();
});

module.exports = mongoose.model('ShopCategory', ShopCategorySchema);
