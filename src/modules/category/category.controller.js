const Category = require('./category.model');
const cloudinary = require('../../config/cloudinary');

// Change getCategories to sort by position
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ position: 1, createdAt: -1 });
    res.status(200).json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    next(error);
  }
};
asdfasd asdfas
// Add this new controller
exports.reorderCategories = async (req, res, next) => {
  try {
    // orderedIds = ['id1', 'id2', 'id3', ...] in new order
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: 'orderedIds must be an array' });
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { position: index } },
      },
    }));

    await Category.bulkWrite(bulkOps);

    res.status(200).json({ success: true, message: 'Categories reordered' });
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    let imageUrl = 'https://placehold.co/600x400?text=Category';

    if (req.file) {
      const base64Image = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${base64Image}`;
      const uploadResponse = await cloudinary.uploader.upload(dataURI, {
        folder: 'restaurant/categories'
      });
      imageUrl = uploadResponse.secure_url;
    }

    const { title } = req.body;
    const category = await Category.create({ title, image: imageUrl });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// Add this to your existing controller
exports.updateCategory = async (req, res, next) => {
  try {
    let category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Update the title
    category.title = req.body.title || category.title;

    // Handle Image if exists
    if (req.file) {
      const base64Image = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${base64Image}`;
      const uploadResponse = await cloudinary.uploader.upload(dataURI, {
        folder: 'restaurant/categories'
      });
      category.image = uploadResponse.secure_url;
    }

    // Using .save() triggers the pre('save') middleware to update the slug!
    await category.save();

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    await category.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};