const ShopOrder   = require('./shop-order.model');
const ShopProduct  = require('./shop-product.model');
const ShopCategory = require('./shop-category.model');

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

exports.getStats = async (req, res) => {
  try {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      revenueAgg,
      monthlyAgg,
      todayAgg,
      totalProducts,
      availableProducts,
      featuredProducts,
      totalCategories,
      recentOrders,
      orderStatusStats,
      topProducts,
    ] = await Promise.all([
      ShopOrder.countDocuments(),
      ShopOrder.countDocuments({ orderStatus: 'placed' }),
      ShopOrder.countDocuments({ orderStatus: 'processing' }),
      ShopOrder.countDocuments({ orderStatus: 'shipped' }),
      ShopOrder.countDocuments({ orderStatus: 'delivered' }),
      ShopOrder.countDocuments({ orderStatus: 'cancelled' }),
      ShopOrder.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]),
      ShopOrder.aggregate([{ $match: { createdAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      ShopOrder.aggregate([{ $match: { createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      ShopProduct.countDocuments(),
      ShopProduct.countDocuments({ isAvailable: true }),
      ShopProduct.countDocuments({ isFeatured: true }),
      ShopCategory.countDocuments(),
      ShopOrder.find().sort({ createdAt: -1 }).limit(5).select('orderId fullName total orderStatus createdAt'),
      ShopOrder.aggregate([{ $group: { _id: '$orderStatus', total: { $sum: 1 } } }]),
      ShopOrder.aggregate([
        { $unwind: '$items' },
        { $group: { _id: '$items.title', totalSold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders,
          pendingOrders,
          processingOrders,
          shippedOrders,
          deliveredOrders,
          cancelledOrders,
          totalRevenue:   revenueAgg[0]?.total  || 0,
          monthlyRevenue: monthlyAgg[0]?.total   || 0,
          todayRevenue:   todayAgg[0]?.total     || 0,
          totalProducts,
          availableProducts,
          featuredProducts,
          totalCategories,
        },
        recentOrders,
        orderStatusStats,
        topProducts,
      },
    });
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
