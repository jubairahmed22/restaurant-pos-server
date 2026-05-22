const Order = require('../orders/order.model');
const Food = require('../foods/food.model');
const Category = require('../category/category.model');
const User = require('../users/user.model');

// =========================================
// GET ADVANCED DASHBOARD STATS
// =========================================
exports.getDashboardStats = async (req, res, next) => {
  try {
    // =====================================
    // DATE HELPERS
    // =====================================

    const now = new Date(); asdfas

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