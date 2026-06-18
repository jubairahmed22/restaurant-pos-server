const express = require('express');
const router  = express.Router();
const { getReviews, createReview, deleteReview } = require('./review.controller');

router.get('/',     getReviews);
router.post('/',    createReview);
router.delete('/:id', deleteReview);

module.exports = router;
