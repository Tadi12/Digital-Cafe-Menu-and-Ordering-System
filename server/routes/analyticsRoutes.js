const express = require('express');
const router = express.Router();
const {
  getDashboardMetrics,
  getRevenueAnalytics,
  getPopularFoodsAnalytics,
} = require('../controllers/analyticsController');
const { protectAdmin, requireRole, MANAGEMENT_ROLES } = require('../middleware/authMiddleware');

// Revenue and sales figures are management information. A chef or barista works
// the ticket queue and has no need for takings, so these stay out of their reach.
router.use(protectAdmin, requireRole(MANAGEMENT_ROLES));

router.get('/dashboard', getDashboardMetrics);
router.get('/revenue', getRevenueAnalytics);
router.get('/popular-foods', getPopularFoodsAnalytics);

module.exports = router;
