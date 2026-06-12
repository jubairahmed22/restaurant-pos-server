const express = require('express');
const router = express.Router();
const { protect, authorize, optionalAuth } = require('../../middleware/auth');

const catCtrl     = require('./shop-category.controller');
const productCtrl = require('./shop-product.controller');
const offerCtrl   = require('./shop-offer.controller');
const orderCtrl   = require('./shop-order.controller');

// ── Categories ────────────────────────────────────────────
router.get('/categories',       catCtrl.getAll);
router.get('/categories/:id',   catCtrl.getOne);
router.post('/categories',      protect, authorize('admin'), catCtrl.create);
router.put('/categories/:id',   protect, authorize('admin'), catCtrl.update);
router.delete('/categories/:id',protect, authorize('admin'), catCtrl.remove);

// ── Products ──────────────────────────────────────────────
router.get('/products',                   productCtrl.getAll);
router.post('/products/bulk-discount',    protect, authorize('admin'), productCtrl.bulkDiscount);
router.get('/products/admin',             protect, authorize('admin'), productCtrl.getAllAdmin);
router.post('/products',                  protect, authorize('admin'), productCtrl.create);
router.get('/products/:id',               productCtrl.getOne);
router.put('/products/:id',               protect, authorize('admin'), productCtrl.update);
router.delete('/products/:id',            protect, authorize('admin'), productCtrl.remove);
router.patch('/products/:id/featured',    protect, authorize('admin'), productCtrl.toggleFeatured);

// ── Offers ────────────────────────────────────────────────
router.get('/offers',       offerCtrl.getAll);
router.get('/offers/:id',   offerCtrl.getOne);
router.post('/offers',      protect, authorize('admin'), offerCtrl.create);
router.put('/offers/:id',   protect, authorize('admin'), offerCtrl.update);
router.delete('/offers/:id',protect, authorize('admin'), offerCtrl.remove);

// ── Orders ────────────────────────────────────────────────
router.post('/orders',           optionalAuth, orderCtrl.placeOrder);
router.get('/orders',            protect, authorize('admin'), orderCtrl.getOrders);
router.patch('/orders/:id/status', protect, authorize('admin'), orderCtrl.updateStatus);

module.exports = router;
