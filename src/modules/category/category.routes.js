const express = require('express');
const { 
  getCategories, 
  createCategory, 
  deleteCategory, 
  updateCategory,
  reorderCategories   // ← add this
 
} = require('./category.controller');
const { protect, authorize } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

const router = express.Router();

router.route('/reorder')
  .put(protect, authorize('admin'), reorderCategories);

// Root routes
router.route('/')
  .get(getCategories)
  .post(protect, authorize('admin'), upload.single('image'), createCategory);

// ID-based routes (MERGED INTO ONE)
router.route('/:id')
  .put(protect, authorize('admin'), upload.single('image'), updateCategory)
  .delete(protect, authorize('admin'), deleteCategory);

module.exports = router;