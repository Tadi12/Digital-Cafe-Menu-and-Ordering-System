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
const { protectAdmin } = require('../middleware/authMiddleware');

router
  .route('/')
  .post(createOrder)
  .get(protectAdmin, getOrders);

router.get('/customer', getCustomerOrders);
router.get('/customer/:customerName', getCustomerOrders);
router.get('/:id', getOrderById);
router.patch('/:id/status', protectAdmin, updateOrderStatus);
router.patch('/:id/cancel', cancelOrder);

module.exports = router;
