// backend/src/modules/foods/food.routes.js

const express = require('express');

const {
  getFoods,
  getFoodBySlug,
  createFood,
  updateFood,
  deleteFood,
} = require('./food.controller');

const { protect, authorize } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

const router = express.Router();

router
  .route('/')
  .get(getFoods)
  .post(
    protect,
    authorize('admin'),
    upload.single('image'),
    createFood
  );

router.route('/slug/:slug').get(getFoodBySlug);

router
  .route('/:id')
  .put(
    protect,
    authorize('admin'),
    upload.single('image'),
    updateFood
  )
  .delete(protect, authorize('admin'), deleteFood);

module.exports = router;