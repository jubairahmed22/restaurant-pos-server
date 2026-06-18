const Order     = require('../orders/order.model');
const ShopOrder = require('../shop/shop-order.model');
const Food      = require('../foods/food.model');
const Category  = require('../category/category.model');
const User      = require('../users/user.model');

// =========================================
// GET ADVANCED DASHBOARD STATS
// =========================================
exports.getDashboardStats = async (req, res, next) => {
  try {
    // =====================================
    // DATE HELPERS
    // =====================================

    const now = new Date();

    const startOfToday = new Date(); 
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 6);
    last7Days.setHours(0, 0, 0, 0);

    // =====================================
    // BASIC COUNTS
    // =====================================

    const totalOrders =
      await Order.countDocuments();

    const totalFoods =
      await Food.countDocuments();

    const totalCategories =
      await Category.countDocuments();

    const totalUsers =
      await User.countDocuments();

    const pendingOrders =
      await Order.countDocuments({
        orderStatus: {
          $in: ['placed', 'processing'],
        },
      });

    const completedOrders =
      await Order.countDocuments({
        orderStatus: 'delivered',
      });

    // =====================================
    // REVENUE
    // =====================================

    const revenueAgg = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
        },
      },

      {
        $group: {
          _id: null,

          totalRevenue: {
            $sum: '$total',
          },
        },
      },
    ]);

    const totalRevenue =
      revenueAgg[0]?.totalRevenue || 0;

    // =====================================
    // TODAY SALES
    // =====================================

    const todaySalesAgg =
      await Order.aggregate([
        {
          $match: {
            paymentStatus: 'paid',
            createdAt: {
              $gte: startOfToday,
            },
          },
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

    const todaySales =
      todaySalesAgg[0]?.total || 0;

    // =====================================
    // MONTH SALES
    // =====================================

    const monthSalesAgg =
      await Order.aggregate([
        {
          $match: {
            paymentStatus: 'paid',
            createdAt: {
              $gte: startOfMonth,
            },
          },
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

    const monthlyRevenue =
      monthSalesAgg[0]?.total || 0;

    // =====================================
    // LAST 7 DAYS CHART
    // =====================================

    const salesChart =
      await Order.aggregate([
        {
          $match: {
            paymentStatus: 'paid',

            createdAt: {
              $gte: last7Days,
            },
          },
        },

        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
              },
            },

            sales: {
              $sum: '$total',
            },

            orders: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            _id: 1,
          },
        },
      ]);

    // =====================================
    // ORDER STATUS DISTRIBUTION
    // =====================================

    const orderStatusStats =
      await Order.aggregate([
        {
          $group: {
            _id: '$orderStatus',

            total: {
              $sum: 1,
            },
          },
        },
      ]);

    // =====================================
    // TOP SELLING FOODS
    // =====================================

    const topFoods = await Order.aggregate([
      {
        $unwind: '$items',
      },

      {
        $group: {
          _id: '$items.title',

          totalSold: {
            $sum: '$items.quantity',
          },

          revenue: {
            $sum: {
              $multiply: [
                '$items.quantity',
                '$items.price',
              ],
            },
          },
        },
      },

      {
        $sort: {
          totalSold: -1,
        },
      },

      {
        $limit: 5,
      },
    ]);

    // =====================================
    // RECENT ORDERS
    // =====================================

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        'orderId fullName total orderStatus createdAt'
      );

    // =====================================
    // RESPONSE
    // =====================================

    res.status(200).json({
      success: true,

      data: {
        summary: {
          totalRevenue,
          monthlyRevenue,
          todaySales,

          totalOrders,
          pendingOrders,
          completedOrders,

          totalFoods,
          totalCategories,
          totalUsers,
        },

        salesChart,

        orderStatusStats,

        topFoods,

        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};
// =========================================
// FINANCIAL INTELLIGENCE
// GET /api/v1/analytics/financial?days=30
// =========================================
exports.getFinancialReport = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const now  = new Date();

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
    periodStart.setHours(0, 0, 0, 0);

    const prevStart = new Date();
    prevStart.setDate(prevStart.getDate() - days * 2);
    prevStart.setHours(0, 0, 0, 0);

    const paidFilter = { paymentStatus: 'paid', createdAt: { $gte: periodStart } };
    const paidPrevFilter = { paymentStatus: 'paid', createdAt: { $gte: prevStart, $lt: periodStart } };

    // Current + previous period revenue (menu orders)
    const [curRev, prevRev] = await Promise.all([
      Order.aggregate([{ $match: paidFilter }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
      Order.aggregate([{ $match: paidPrevFilter }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    ]);

    // Shop revenue same periods
    const [shopCur, shopPrev] = await Promise.all([
      ShopOrder.aggregate([{ $match: paidFilter }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
      ShopOrder.aggregate([{ $match: paidPrevFilter }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    ]);

    const menuRev  = curRev[0]?.total  || 0;
    const menuPrev = prevRev[0]?.total || 0;
    const shopRev  = shopCur[0]?.total  || 0;
    const shopPrevRev = shopPrev[0]?.total || 0;
    const totalRev  = menuRev + shopRev;
    const totalPrev = menuPrev + shopPrevRev;
    const revChange = totalPrev > 0 ? ((totalRev - totalPrev) / totalPrev) * 100 : null;

    const menuOrders  = curRev[0]?.count  || 0;
    const shopOrders  = shopCur[0]?.count || 0;
    const totalOrders = menuOrders + shopOrders;
    const aov = totalOrders > 0 ? totalRev / totalOrders : 0;

    // Revenue by payment method
    const byMethod = await Order.aggregate([
      { $match: paidFilter },
      { $group: { _id: '$paymentMethod', revenue: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);

    // Revenue by session (Lunch = pickupTime 11-14, Dinner = 17-20, null = walk-in/no slot)
    const bySession = await Order.aggregate([
      { $match: paidFilter },
      { $addFields: {
        session: {
          $cond: [
            { $regexMatch: { input: { $ifNull: ['$pickupTime', ''] }, regex: /^1[1-4]:/ } },
            'Lunch',
            { $cond: [
              { $regexMatch: { input: { $ifNull: ['$pickupTime', ''] }, regex: /^(1[7-9]|20):/ } },
              'Dinner',
              'Walk-in / No Slot'
            ]}
          ]
        }
      }},
      { $group: { _id: '$session', revenue: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);

    // Daily revenue for the period
    const dailyRevenue = await Order.aggregate([
      { $match: paidFilter },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Delivery charge contribution
    const deliveryAgg = await Order.aggregate([
      { $match: paidFilter },
      { $group: { _id: null, totalDelivery: { $sum: '$deliveryCharge' }, totalRevenue: { $sum: '$total' } } },
    ]);
    const deliveryContrib = deliveryAgg[0] || { totalDelivery: 0, totalRevenue: totalRev };

    res.status(200).json({
      success: true,
      data: {
        period: { days, start: periodStart, end: now },
        summary: {
          menuRevenue: menuRev, shopRevenue: shopRev,
          totalRevenue: totalRev, revenueChange: revChange,
          totalOrders, averageOrderValue: aov,
          deliveryChargeTotal: deliveryContrib.totalDelivery,
          deliveryAsPercentOfRevenue: totalRev > 0 ? (deliveryContrib.totalDelivery / totalRev) * 100 : 0,
        },
        byPaymentMethod: byMethod,
        bySession,
        dailyRevenue,
      },
    });
  } catch (error) { next(error); }
};

// =========================================
// MARKETING INTELLIGENCE
// GET /api/v1/analytics/marketing?days=30
// =========================================
exports.getMarketingReport = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
    periodStart.setHours(0, 0, 0, 0);

    const paidFilter = { paymentStatus: 'paid', createdAt: { $gte: periodStart } };

    // Sales by day of week (0=Sun … 6=Sat)
    const byDayOfWeek = await Order.aggregate([
      { $match: paidFilter },
      { $group: { _id: { $dayOfWeek: '$createdAt' }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Sales by hour of day
    const byHour = await Order.aggregate([
      { $match: paidFilter },
      { $group: { _id: { $hour: '$createdAt' }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Top categories by revenue
    const topCategories = await Order.aggregate([
      { $match: paidFilter },
      { $unwind: '$items' },
      { $lookup: { from: 'foods', localField: 'items.food', foreignField: '_id', as: 'foodDoc' } },
      { $unwind: { path: '$foodDoc', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'categories', localField: 'foodDoc.category', foreignField: '_id', as: 'catDoc' } },
      { $unwind: { path: '$catDoc', preserveNullAndEmptyArrays: true } },
      { $group: {
        _id: { $ifNull: ['$catDoc.name', 'Uncategorised'] },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        unitsSold: { $sum: '$items.quantity' },
      }},
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);

    // Item velocity — fast movers vs slow movers (units/day)
    const itemVelocity = await Order.aggregate([
      { $match: paidFilter },
      { $unwind: '$items' },
      { $group: { _id: '$items.title', totalSold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $addFields: { velocityPerDay: { $divide: ['$totalSold', days] } } },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);

    // Order type split: delivery (has shippingAddress) vs pickup (has pickupTime) vs walk-in
    const orderTypeSplit = await Order.aggregate([
      { $match: paidFilter },
      { $addFields: {
        orderType: {
          $cond: [
            { $and: [{ $ne: ['$pickupTime', null] }, { $ne: ['$pickupTime', ''] }] },
            'pickup',
            { $cond: [
              { $and: [{ $ne: ['$shippingAddress', ''] }, { $ne: ['$deliveryCharge', 0] }] },
              'delivery',
              'walk-in'
            ]}
          ]
        }
      }},
      { $group: { _id: '$orderType', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
    ]);

    res.status(200).json({
      success: true,
      data: { period: { days }, byDayOfWeek, byHour, topCategories, itemVelocity, orderTypeSplit },
    });
  } catch (error) { next(error); }
};

// =========================================
// CONVERSION FUNNEL
// GET /api/v1/analytics/conversion?days=30
// =========================================
exports.getConversionFunnel = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
    periodStart.setHours(0, 0, 0, 0);

    const dateFilter = { createdAt: { $gte: periodStart } };

    const [statusCounts, paymentCounts, avgOrderTime] = await Promise.all([
      Order.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$paymentStatus', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        { $match: { ...dateFilter, orderStatus: 'delivered' } },
        { $group: { _id: null, avgTotal: { $avg: '$total' } } },
      ]),
    ]);

    const total = statusCounts.reduce((s, c) => s + c.count, 0);
    const paid  = paymentCounts.find(p => p._id === 'paid')?.count || 0;
    const failed = paymentCounts.find(p => p._id === 'failed')?.count || 0;

    res.status(200).json({
      success: true,
      data: {
        period: { days },
        totalOrders: total,
        paymentConversionRate: total > 0 ? (paid / total) * 100 : 0,
        paymentFailureRate: total > 0 ? (failed / total) * 100 : 0,
        avgCompletedOrderValue: avgOrderTime[0]?.avgTotal || 0,
        byOrderStatus: statusCounts,
        byPaymentStatus: paymentCounts,
      },
    });
  } catch (error) { next(error); }
};

// =========================================
// ATTRIBUTION REPORT
// GET /api/v1/analytics/attribution?days=30
// =========================================
exports.getAttributionReport = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
    periodStart.setHours(0, 0, 0, 0);

    const filter = { paymentStatus: 'paid', createdAt: { $gte: periodStart } };

    const [bySource, byMedium, byCampaign] = await Promise.all([
      Order.aggregate([
        { $match: filter },
        { $group: { _id: { $ifNull: ['$attribution.source', 'direct'] }, orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $sort: { revenue: -1 } },
      ]),
      Order.aggregate([
        { $match: filter },
        { $group: { _id: { $ifNull: ['$attribution.medium', '(none)'] }, orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $sort: { revenue: -1 } },
      ]),
      Order.aggregate([
        { $match: { ...filter, 'attribution.campaign': { $ne: '' } } },
        { $group: { _id: '$attribution.campaign', orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: { period: { days }, bySource, byMedium, byCampaign },
    });
  } catch (error) { next(error); }
};

// =========================================
// BUSINESS REPORT (combined)
// GET /api/v1/analytics/business?days=30
// =========================================
exports.getBusinessReport = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
    periodStart.setHours(0, 0, 0, 0);

    const paidFilter   = { paymentStatus: 'paid', createdAt: { $gte: periodStart } };
    const dateFilter   = { createdAt: { $gte: periodStart } };

    const Reservation = require('../reservation/reservation.model');

    const [menuRevAgg, shopRevAgg, menuOrdersTotal, shopOrdersTotal, reservations, newUsers, dailyMenu, dailyShop] = await Promise.all([
      Order.aggregate([{ $match: paidFilter }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      ShopOrder.aggregate([{ $match: paidFilter }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.countDocuments(dateFilter),
      ShopOrder.countDocuments(dateFilter),
      Reservation.countDocuments(dateFilter),
      User.countDocuments(dateFilter),
      Order.aggregate([
        { $match: paidFilter },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      ShopOrder.aggregate([
        { $match: paidFilter },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const menuRev = menuRevAgg[0]?.total || 0;
    const shopRev = shopRevAgg[0]?.total || 0;

    // Merge daily data
    const dayMap = new Map();
    for (const d of dailyMenu) {
      dayMap.set(d._id, { date: d._id, menuRevenue: d.revenue, menuOrders: d.orders, shopRevenue: 0, shopOrders: 0 });
    }
    for (const d of dailyShop) {
      const existing = dayMap.get(d._id) || { date: d._id, menuRevenue: 0, menuOrders: 0 };
      dayMap.set(d._id, { ...existing, shopRevenue: d.revenue, shopOrders: d.orders });
    }
    const dailyCombined = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    res.status(200).json({
      success: true,
      data: {
        period: { days, start: periodStart, end: new Date() },
        summary: {
          menuRevenue: menuRev,
          shopRevenue: shopRev,
          totalRevenue: menuRev + shopRev,
          menuOrders: menuOrdersTotal,
          shopOrders: shopOrdersTotal,
          totalOrders: menuOrdersTotal + shopOrdersTotal,
          reservations,
          newUsers,
        },
        dailyCombined,
      },
    });
  } catch (error) { next(error); }
};
