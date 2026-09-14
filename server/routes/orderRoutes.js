const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getCustomerOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
} = require('../controllers/orderController');
const { protectAdmin, attachAdminIfAuthenticated } = require('../middleware/authMiddleware');
const { requireCafeWifi } = require('../middleware/cafeWifiMiddleware');

router
  .route('/')
  .post(requireCafeWifi, createOrder)
  .get(protectAdmin, getOrders);

router.get('/customer', requireCafeWifi, getCustomerOrders);
router.get('/customer/:customerName', requireCafeWifi, getCustomerOrders);
router.get('/:id', attachAdminIfAuthenticated, requireCafeWifi, getOrderById);
router.patch('/:id/status', protectAdmin, updateOrderStatus);
router.patch('/:id/cancel', requireCafeWifi, cancelOrder);

module.exports = router;
