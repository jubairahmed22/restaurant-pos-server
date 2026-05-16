const mongoose = require('mongoose');

const FoodSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Title required'], trim: true },
  slug: { type: String, unique: true, lowercase: true },
  description: { type: String, required: [true, 'Description required'] },
  price: { type: Number, required: [true, 'Price required'] },
  discountPrice: { type: Number, default: 0 },
  image: { type: String, default: 'https://placehold.co/600x400?text=Food' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  stock: { type: Number, default: 99 },
  isFeatured: { type: Boolean, default: false },
  seoTitle: String,
  seoDescription: String,
  createdAt: { type: Date, default: Date.now }
});

FoodSchema.pre('save', function(next) {
  if (this.title) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  next();
});

module.exports = mongoose.model('Food', FoodSchema);