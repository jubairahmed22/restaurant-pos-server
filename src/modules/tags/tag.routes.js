const express = require('express');
const { getTags, createTag } = require('./tag.controller');
const { protect, authorize } = require('../../middleware/auth');

const router = express.Router();

router.route('/')
  .get(getTags)
  .post(protect, authorize('admin'), createTag);

module.exports = router;