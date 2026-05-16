const Order = require('./order.model');
const { getIO } = require('../../sockets/socketServer');
const sendEmail = require('../../utils/sendEmail');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');

exports.createOrder = async (req, res, next) => {
  try {
    const { items, subtotal, deliveryCharge, total, shippingAddress } = req.body;

    const order = await Order.create({
      user: req.user.id,
      items,
      subtotal,
      deliveryCharge,
      total,
      shippingAddress,
      paymentStatus: 'pending'
    });

    // Alert dashboard via Socket.io
    try {
      const io = getIO();
      io.emit('new-order', order);
    } catch (e) {
      console.log("Socket connection skipped during local pipeline run");
    }

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.processStripePayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Order profile tracking mismatch' });

    // PaymentIntent calculation
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100), // convert to cents
      currency: 'usd',
      metadata: { order_id: order._id.toString() }
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    next(error);
  }
};

exports.confirmPaymentSuccess = async (req, res, next) => {
  try {
    const { orderId, paymentIntentId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    order.paymentStatus = 'paid';
    order.stripePaymentIntentId = paymentIntentId;
    await order.save();

    // Fire email receipt notification
    try {
      await sendEmail({
        email: req.user.email,
        subject: `Your Restaurant Order Confirmation ${order.orderId}`,
        html: `<h3>Thank you for your purchase!</h3><p>Total Payment: $${order.total}</p><p>Status: Preparing Food Item.</p>`
      });
    } catch (err) {
      console.log("Email pipeline failed - check SMTP credentials setup");
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

exports.getAllOrdersAdmin = async (req, res, next) => {
  try {
    const orders = await Order.find().populate('user', 'name email').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order document missing' });

    order.orderStatus = req.body.orderStatus;
    await order.save();

    try {
      getIO().emit('order-status-updated', order);
    } catch (e) {}

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};