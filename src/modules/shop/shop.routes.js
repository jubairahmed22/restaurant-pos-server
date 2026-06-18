const express = require('express');
const router = express.Router();
const { protect, authorize, optionalAuth } = require('../../middleware/auth');

const catCtrl      = require('./shop-category.controller');
const productCtrl  = require('./shop-product.controller');
const offerCtrl    = require('./shop-offer.controller');
const orderCtrl    = require('./shop-order.controller');
const uploadCtrl   = require('./shop-upload.controller');
const upload       = require('../../middleware/upload');

// ── Upload ────────────────────────────────────────────────
router.post('/upload/single',   protect, authorize('admin'), upload.single('image'),       uploadCtrl.uploadSingle);
router.post('/upload/multiple', protect, authorize('admin'), upload.array('images', 10),   uploadCtrl.uploadMultiple);

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
router.patch('/products/:id/available',   protect, authorize('admin'), productCtrl.toggleAvailable);

// ── Offers ────────────────────────────────────────────────
router.get('/offers',       offerCtrl.getAll);
router.get('/offers/:id',   offerCtrl.getOne);
router.post('/offers',      protect, authorize('admin'), offerCtrl.create);
router.put('/offers/:id',   protect, authorize('admin'), offerCtrl.update);
router.delete('/offers/:id',protect, authorize('admin'), offerCtrl.remove);

// ── Orders ────────────────────────────────────────────────
router.get('/stats',               protect, authorize('admin'), orderCtrl.getStats);
router.post('/orders',             optionalAuth, orderCtrl.placeOrder);
router.get('/orders',              protect, authorize('admin'), orderCtrl.getOrders);
router.patch('/orders/:id/status', protect, authorize('admin'), orderCtrl.updateStatus);

module.exports = router;
