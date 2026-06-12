const ShopOrder = require('./shop-order.model');

exports.placeOrder = async (req, res) => {
  try {
    const { fullName, email, phone, shippingAddress, items, subtotal, deliveryCharge, total, paymentMethod, squarePaymentId } = req.body;

    if (!fullName || !items?.length) {
      return res.status(400).json({ success: false, error: 'Name and items are required' });
    }

    const order = await ShopOrder.create({
      user: req.user?._id || null,
      fullName, email, phone, shippingAddress,
      items, subtotal, deliveryCharge: deliveryCharge || 0, total,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: paymentMethod === 'square' ? 'paid' : 'pending',
      squarePaymentId: squarePaymentId || '',
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, orderStatus, paymentStatus } = req.query;
    const filter = {};
    if (orderStatus)  filter.orderStatus  = orderStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      ShopOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      ShopOrder.countDocuments(filter),
    ]);

    res.json({ success: true, data, pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    const update = {};
    if (orderStatus)  update.orderStatus  = orderStatus;
    if (paymentStatus) update.paymentStatus = paymentStatus;

    const order = await ShopOrder.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
