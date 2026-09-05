const Order = require('../models/Order');

/**
 * @desc    Get dashboard summary metrics (Admin)
 * @route   GET /api/analytics/dashboard
 * @access  Protected (Admin)
 */
const getDashboardMetrics = async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Total orders today
    const ordersToday = await Order.countDocuments({
      createdAt: { $gte: startOfToday },
    });

    // Today's revenue (excluding Cancelled)
    const revenueTodayResult = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfToday },
          status: { $ne: 'Cancelled' },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
        },
      },
    ]);

    const todayRevenue = revenueTodayResult.length > 0 ? revenueTodayResult[0].total : 0;

    // Status counts
    const pendingOrders = await Order.countDocuments({ status: 'Pending' });
    const preparingOrders = await Order.countDocuments({ status: 'Preparing' });
    const readyOrders = await Order.countDocuments({ status: 'Ready' });
    const completedOrders = await Order.countDocuments({ status: 'Completed' });
    const cancelledOrders = await Order.countDocuments({ status: 'Cancelled' });

    // Status breakdown array for charts
    const statusBreakdown = [
      { name: 'Pending', value: pendingOrders },
      { name: 'Preparing', value: preparingOrders },
      { name: 'Ready', value: readyOrders },
      { name: 'Completed', value: completedOrders },
      { name: 'Cancelled', value: cancelledOrders },
    ];

    // Recent 5 orders
    const recentOrders = await Order.find({})
      .populate('table', 'tableNumber tableName')
      .sort({ createdAt: -1 })
      .limit(5);

    return res.json({
      success: true,
      data: {
        ordersToday,
        todayRevenue,
        pendingOrders,
        preparingOrders,
        readyOrders,
        completedOrders,
        cancelledOrders,
        statusBreakdown,
        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get daily revenue history for charts
 * @route   GET /api/analytics/revenue
 * @access  Protected (Admin)
 */
const getRevenueAnalytics = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const revenueData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: 'Cancelled' },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.json({
      success: true,
      data: revenueData.map((item) => ({
        date: item._id,
        revenue: item.revenue,
        orderCount: item.orderCount,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get popular food items analytics
 * @route   GET /api/analytics/popular-foods
 * @access  Protected (Admin)
 */
const getPopularFoodsAnalytics = async (req, res, next) => {
  try {
    const popularFoods = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.food',
          foodNameEn: { $first: '$items.foodName.en' },
          foodNameAm: { $first: '$items.foodName.am' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: {
            $sum: { $multiply: ['$items.price', '$items.quantity'] },
          },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
    ]);

    return res.json({
      success: true,
      data: popularFoods.map((item) => ({
        foodId: item._id,
        name: { en: item.foodNameEn, am: item.foodNameAm },
        totalQuantity: item.totalQuantity,
        totalRevenue: item.totalRevenue,
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardMetrics,
  getRevenueAnalytics,
  getPopularFoodsAnalytics,
};
