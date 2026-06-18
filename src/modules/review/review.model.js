const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  url:         { type: String, required: true, trim: true },
  title:       { type: String, default: '' },
  description: { type: String, default: '' },
  image:       { type: String, default: '' },
  favicon:     { type: String, default: '' },
  domain:      { type: String, default: '' },
  siteName:    { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
