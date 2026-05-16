const Order = require('../orders/order.model');
const Food = require('../foods/food.model');

exports.getDashboardStats = async (req, res, next) => {
  try {
    // Total Revenue Calculation
    const revenueStat = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, totalSales: { $sum: '$total' } } }
    ]);

    const totalRevenue = revenueStat.length > 0 ? revenueStat[0].totalSales : 0;
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: { $ne: 'delivered' } });
    const totalFoodItems = await Food.countDocuments();

    // Sales metrics over time (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const chartData = await Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sales: { $sum: "$total" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: { totalRevenue, totalOrders, pendingOrders, totalFoodItems },
        chart: chartData
      }
    });
  } catch (error) {
    next(error);
  }
};