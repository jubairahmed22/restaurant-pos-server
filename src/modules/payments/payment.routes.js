const express = require('express');
const { squareCheckout, getTransactions, payInRestaurant, squarePing, squareDebug } = require('./payment.controller');
const { optionalAuth, protect, authorize } = require('../../middleware/auth');

const router = express.Router();

router.get('/square-ping',          squarePing);
router.get('/square-debug',         squareDebug);
router.post('/square', optionalAuth, squareCheckout);
router.get('/transactions',         protect, authorize('admin'), getTransactions);
router.post('/pay-in-restaurant',   optionalAuth, payInRestaurant);

module.exports = router;
