const Order = require('../orders/order.model');

// =========================================
// GET /api/v1/payments/transactions
// Returns Square payment orders with filters
// =========================================
exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, name, email, transactionId } = req.query;

    const query = { paymentMethod: 'square' };
    if (name)          query.fullName        = { $regex: name,          $options: 'i' };
    if (email)         query.email           = { $regex: email,         $options: 'i' };
    if (transactionId) query.squarePaymentId = { $regex: transactionId, $options: 'i' };

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Order.countDocuments(query);

    const transactions = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page:       Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        limit:      Number(limit),
      },
    });
  } catch (err) {
    console.error('getTransactions error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =========================================
// POST /api/v1/payments/pay-in-restaurant
// Creates an order for payment at the restaurant (cash on collection)
// =========================================
exports.payInRestaurant = async (req, res) => {
  try {
    const { fullName, email, phone, shippingAddress, items, subtotal, deliveryCharge, total,
          pickupDate, pickupTime, pickupDisplayDate, pickupDisplayTime } = req.body;

    if (!fullName)      return res.status(400).json({ success: false, error: 'Full name is required' });
    if (!phone)         return res.status(400).json({ success: false, error: 'Phone number is required' });
    if (!items?.length) return res.status(400).json({ success: false, error: 'No items in order' });

    const order = await Order.create({
      user:           req.user?._id ?? null,
      items,
      subtotal:       Number(subtotal)       || 0,
      deliveryCharge: Number(deliveryCharge) || 0,
      total:          Number(total)          || 0,
      fullName,
      email:          email || '',
      phone,
      shippingAddress:    shippingAddress || 'Pickup',
      paymentMethod:      'cash',
      paymentStatus:      'pending',
      orderStatus:        'placed',
      pickupDate:         pickupDate        || null,
      pickupTime:         pickupTime        || null,
      pickupDisplayDate:  pickupDisplayDate || null,
      pickupDisplayTime:  pickupDisplayTime || null,
    });

    res.status(201).json({
      success: true,
      message: 'Order placed! Please pay at the restaurant.',
      data: { orderId: order.orderId, _id: order._id },
    });
  } catch (err) {
    console.error('payInRestaurant error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || '';
const SQUARE_LOCATION_ID  = process.env.SQUARE_LOCATION_ID  || '';
const SQUARE_ENV          = (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase();

const SQUARE_BASE =
  SQUARE_ENV === 'sandbox'
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com';

// Log on startup so you can verify env vars are loading
console.log(`[Square] env=${SQUARE_ENV} base=${SQUARE_BASE} token=${SQUARE_ACCESS_TOKEN ? SQUARE_ACCESS_TOKEN.slice(0,8)+'...' : 'MISSING'} location=${SQUARE_LOCATION_ID || 'MISSING'}`);

// GET /api/v1/payments/square-debug  — shows masked env values loaded on this server
exports.squareDebug = (req, res) => {
  const token = process.env.SQUARE_ACCESS_TOKEN || '';
  const loc   = process.env.SQUARE_LOCATION_ID  || '';
  const env   = process.env.SQUARE_ENVIRONMENT  || '';
  res.json({
    SQUARE_ENVIRONMENT:  env   || 'NOT SET',
    SQUARE_LOCATION_ID:  loc   || 'NOT SET',
    SQUARE_ACCESS_TOKEN: token ? `${token.slice(0, 12)}...${token.slice(-4)} (length: ${token.length})` : 'NOT SET',
    resolvedBase: env.toLowerCase() === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com',
  });
};

// GET /api/v1/payments/square-ping
// Full credential diagnostic — checks token, location, AND which merchant/app the token belongs to
exports.squarePing = async (req, res) => {
  try {
    if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
      return res.status(500).json({ success: false, error: 'Square env vars not set on this server' });
    }

    const headers = {
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Square-Version': '2024-06-04',
    };

    // Check location
    const locRes  = await fetch(`${SQUARE_BASE}/v2/locations/${SQUARE_LOCATION_ID}`, { headers });
    const locData = await locRes.json();
    if (!locRes.ok) {
      return res.status(locRes.status).json({ success: false, check: 'location', errors: locData.errors });
    }

    // Get merchant info — reveals which account this token belongs to
    const merRes  = await fetch(`${SQUARE_BASE}/v2/merchants`, { headers });
    const merData = await merRes.json();

    res.json({
      success:      true,
      env:          SQUARE_ENV,
      tokenPrefix:  SQUARE_ACCESS_TOKEN.slice(0, 12) + '...',
      location:     { id: SQUARE_LOCATION_ID, name: locData.location?.name, currency: locData.location?.currency },
      merchant:     merData.merchant ? { id: merData.merchant[0]?.id, businessName: merData.merchant[0]?.business_name, country: merData.merchant[0]?.country } : merData,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/v1/payments/square
exports.squareCheckout = async (req, res) => {
  try {
    const {
      sourceId,
      fullName,
      email,
      phone,
      shippingAddress,
      items,
      subtotal,
      deliveryCharge,
      total,
    } = req.body;

    if (!sourceId)        return res.status(400).json({ success: false, error: 'Payment token (sourceId) is required' });
    if (!fullName)        return res.status(400).json({ success: false, error: 'Full name is required' });
    if (!phone)           return res.status(400).json({ success: false, error: 'Phone number is required' });
    if (!shippingAddress) return res.status(400).json({ success: false, error: 'Delivery address is required' });
    if (!items?.length)   return res.status(400).json({ success: false, error: 'No items in order' });

    const totalAmount = Number(total) || 0;
    if (totalAmount <= 0) return res.status(400).json({ success: false, error: 'Invalid order total' });

    const amountCents    = Math.round(totalAmount * 100);
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const squareRes = await fetch(`${SQUARE_BASE}/v2/payments`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Square-Version': '2024-06-04',
      },
      body: JSON.stringify({
        source_id:       sourceId,
        idempotency_key: idempotencyKey,
        amount_money: {
          amount:   amountCents,
          currency: 'AUD',
        },
        location_id:          SQUARE_LOCATION_ID,
        buyer_email_address:  email || undefined,
        note: `Order from ${fullName} — ${phone}`,
      }),
    });

    const squareData = await squareRes.json();

    if (!squareRes.ok || squareData.errors?.length) {
      const errMsg = squareData.errors?.[0]?.detail || 'Square payment failed';
      console.error('[Square] Payment failed — HTTP', squareRes.status, JSON.stringify(squareData.errors, null, 2));
      console.error('[Square] Used token prefix:', SQUARE_ACCESS_TOKEN.slice(0, 8), '| location:', SQUARE_LOCATION_ID, '| env:', SQUARE_ENV, '| base:', SQUARE_BASE);
      return res.status(402).json({ success: false, error: errMsg });
    }

    const squarePaymentId = squareData.payment?.id;

    const order = await Order.create({
      user:           req.user?._id ?? null,
      items,
      subtotal:       Number(subtotal)       || 0,
      deliveryCharge: Number(deliveryCharge) || 0,
      total:          totalAmount,
      fullName,
      email:          email || '',
      phone,
      shippingAddress,
      paymentMethod:  'square',
      paymentStatus:  'paid',
      orderStatus:    'placed',
      squarePaymentId,
    });

    res.status(201).json({
      success: true,
      message: 'Payment successful. Order placed!',
      data: {
        orderId: order.orderId,
        _id:     order._id,
        squarePaymentId,
      },
    });
  } catch (err) {
    console.error('squareCheckout error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
