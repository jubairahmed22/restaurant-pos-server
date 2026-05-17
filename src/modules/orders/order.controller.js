const Order = require('./order.model');

// @desc    Create a new order (Cash only)
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { items, subtotal, deliveryCharge, total, shippingAddress } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items in order' });
    }

    const order = await Order.create({
      user: req.user._id,
      items,
      subtotal,
      deliveryCharge: deliveryCharge || 0,
      total,
      shippingAddress,
      paymentMethod: 'cash',
      paymentStatus: 'pending', // Will be collected on delivery / at counter
      orderStatus: 'placed',
    });

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get logged-in user's orders
// @route   GET /api/orders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get all orders (Admin/Staff)
// @route   GET /api/orders/admin
// @access  Private/Admin/Staff
exports.getAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin/Staff
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, paymentStatus } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};