const express = require('express');
const { 
  getCategories, 
  createCategory, 
  deleteCategory, 
  updateCategory 
} = require('./category.controller');
const { protect, authorize } = require('../../middleware/auth'); fgasdg
const upload = require('../../middleware/upload');

const router = express.Router();

// Root routes
router.route('/')
  .get(getCategories)
  .post(protect, authorize('admin'), upload.single('image'), createCategory);

// ID-based routes (MERGED INTO ONE)
router.route('/:id')
  .put(protect, authorize('admin'), upload.single('image'), updateCategory)
  .delete(protect, authorize('admin'), deleteCategory);

module.exports = router;