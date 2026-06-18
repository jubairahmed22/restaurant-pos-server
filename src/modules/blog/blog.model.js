const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title:     { type: String, required: true, trim: true },
  paragraph: { type: String, default: '' },
  images:    [{ type: String }],
  videoLink: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Blog', blogSchema);
