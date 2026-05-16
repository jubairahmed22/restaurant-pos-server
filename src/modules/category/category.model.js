const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a category title'],
      unique: true,
      trim: true,
      maxlength: [50, 'Title cannot be more than 50 characters'],
    },
    slug: {
      type: String,
      lowercase: true,
    },
    image: {
      type: String,
      default: 'https://placehold.co/600x400?text=Category',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * PRE-SAVE MIDDLEWARE
 * CRITICAL: Use a standard function() here, NOT an arrow function.
 * This ensures "this" refers to the current category document.
 */
categorySchema.pre('save', function (next) {
  // Only slugify if the title is new or being modified
  if (!this.isModified('title')) {
    return next();
  }

  // Create the slug from the title (e.g., "Fast Food" -> "fast-food")
  this.slug = slugify(this.title, {
    lower: true,
    strict: true,
  });

  next();
});

// Virtual populate for foods (Optional: allows you to see foods belonging to this category)
categorySchema.virtual('foods', {
  ref: 'Food',
  localField: '_id',
  foreignField: 'category',
  justOne: false,
});

module.exports = mongoose.model('Category', categorySchema);