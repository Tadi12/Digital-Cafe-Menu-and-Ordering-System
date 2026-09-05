const express = require('express');
const router = express.Router();
const {
  getDashboardMetrics,
  getRevenueAnalytics,
  getPopularFoodsAnalytics,
} = require('../controllers/analyticsController');
const { protectAdmin } = require('../middleware/authMiddleware');

router.use(protectAdmin);

router.get('/dashboard', getDashboardMetrics);
router.get('/revenue', getRevenueAnalytics);
router.get('/popular-foods', getPopularFoodsAnalytics);

module.exports = router;
