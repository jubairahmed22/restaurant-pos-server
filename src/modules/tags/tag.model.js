const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tag title is required'],
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  }
});

TagSchema.pre('save', function(next) {
  if (this.title) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  next();
});

module.exports = mongoose.model('Tag', TagSchema);