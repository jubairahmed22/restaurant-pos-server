const Order = require('./order.model');

// =========================================
// CREATE ORDER
// =========================================
exports.createOrder = async (req, res) => {
  try {
    const {
      items,
      subtotal,
      deliveryCharge,
      total,
      shippingAddress,
      fullName,
      email,
      phone,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No order items provided',
      });
    }

    if (!fullName || !phone || !shippingAddress) {
      return res.status(400).json({
        success: false,
        error: 'Full name, phone and shipping address are required',
      });
    }

    const order = await Order.create({
      user: req.user?._id,

      items,

      subtotal: Number(subtotal) || 0,
      deliveryCharge: Number(deliveryCharge) || 0,
      total: Number(total) || 0,

      fullName,
      email: email || req.user?.email || '',
      phone,

      shippingAddress,

      paymentMethod: 'cash',
      paymentStatus: 'pending',
      orderStatus: 'placed',
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order,
    });

  } catch (err) {
    console.error('createOrder error:', err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// =========================================
// GET MY ORDERS
// =========================================
exports.getMyOrders = async (req, res) => {
  try {

    const orders = await Order.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });

  } catch (err) {
    console.error('getMyOrders error:', err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// =========================================
// GET ALL ORDERS ADMIN
// =========================================
exports.getAllOrdersAdmin = async (req, res) => {
  try {

    // ─────────────────────────────────────
    // PAGINATION
    // ─────────────────────────────────────
    const page = Math.max(1, parseInt(req.query.page) || 1);

    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit) || 10)
    );

    const skip = (page - 1) * limit;

    // ─────────────────────────────────────
    // FILTER
    // ─────────────────────────────────────
    const filter = {};

    // status filter
    if (req.query.orderStatus) {
      filter.orderStatus = req.query.orderStatus;
    }

    // payment filter
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    // ─────────────────────────────────────
    // DATE FILTER
    // ─────────────────────────────────────
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const quickFilter = req.query.quickFilter;

    if (startDate || endDate || quickFilter) {
      filter.createdAt = {};

      let start;
      let end;

      // quick filters
      const now = new Date();

      if (quickFilter === 'today') {
        start = new Date();
        start.setHours(0, 0, 0, 0);

        end = new Date();
        end.setHours(23, 59, 59, 999);
      }

      if (quickFilter === 'yesterday') {
        start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);

        end = new Date();
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
      }

      if (quickFilter === 'last7days') {
        start = new Date();
        start.setDate(start.getDate() - 7);

        end = new Date();
      }

      if (quickFilter === 'last30days') {
        start = new Date();
        start.setDate(start.getDate() - 30);

        end = new Date();
      }

      // manual date range
      if (startDate) {
        start = new Date(startDate);
      }

      if (endDate) {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }

      if (start) {
        filter.createdAt.$gte = start;
      }

      if (end) {
        filter.createdAt.$lte = end;
      }
    }

    // ─────────────────────────────────────
    // SEARCH
    // ─────────────────────────────────────
    const search = req.query.search?.trim();

    if (search) {
      filter.$or = [
        {
          orderId: {
            $regex: search,
            $options: 'i',
          },
        },

        {
          fullName: {
            $regex: search,
            $options: 'i',
          },
        },

        {
          email: {
            $regex: search,
            $options: 'i',
          },
        },

        {
          phone: {
            $regex: search,
            $options: 'i',
          },
        },
      ];
    }

    // ─────────────────────────────────────
    // TOTALS
    // ─────────────────────────────────────

    // ALL ORDERS TOTAL
    const allOrdersTotal = await Order.aggregate([
      {
        $group: {
          _id: null,
          total: {
            $sum: '$total',
          },
        },
      },
    ]);

    // FILTERED TOTAL
    const filteredOrdersTotal = await Order.aggregate([
      {
        $match: filter,
      },

      {
        $group: {
          _id: null,
          total: {
            $sum: '$total',
          },
        },
      },
    ]);

    // ─────────────────────────────────────
    // GET ORDERS
    // ─────────────────────────────────────
    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // ─────────────────────────────────────
    // COUNT
    // ─────────────────────────────────────
    const total = await Order.countDocuments(filter);

    // ─────────────────────────────────────
    // RESPONSE
    // ─────────────────────────────────────
    res.status(200).json({
      success: true,

      totals: {
        allOrdersTotal:
          allOrdersTotal[0]?.total || 0,

        filteredOrdersTotal:
          filteredOrdersTotal[0]?.total || 0,
      },

      pagination: {
        total,
        page,
        limit,

        totalPages: Math.ceil(total / limit),

        hasNextPage:
          page < Math.ceil(total / limit),

        hasPrevPage:
          page > 1,
      },

      data: orders,
    });

  } catch (err) {
    console.error('getAllOrdersAdmin error:', err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// =========================================
// UPDATE ORDER STATUS
// =========================================
exports.updateOrderStatus = async (req, res) => {
  try {

    const {
      orderStatus,
      paymentStatus,
      fullName,
      email,
      phone,
      shippingAddress,
    } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (orderStatus) {
      order.orderStatus = orderStatus;
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    if (fullName) {
      order.fullName = fullName;
    }

    if (email) {
      order.email = email;
    }

    if (phone) {
      order.phone = phone;
    }

    if (shippingAddress) {
      order.shippingAddress = shippingAddress;
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: order,
    });

  } catch (err) {
    console.error('updateOrderStatus error:', err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// =========================================
// DELETE ORDER
// =========================================
exports.deleteOrder = async (req, res) => {
  try {

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    await order.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
    });

  } catch (err) {
    console.error('deleteOrder error:', err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};