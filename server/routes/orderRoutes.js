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
const validate = require('../middleware/validateMiddleware');
const { createOrderSchema, updateOrderStatusSchema } = require('../validations/order.schema');

router
  .route('/')
  .post(validate(createOrderSchema), createOrder)
  .get(protectAdmin, getOrders);

router.get('/customer', getCustomerOrders);
router.get('/customer/:customerName', getCustomerOrders);
router.get('/:id', attachAdminIfAuthenticated, getOrderById);
router.patch('/:id/status', protectAdmin, validate(updateOrderStatusSchema), updateOrderStatus);
router.patch('/:id/cancel', cancelOrder);

module.exports = router;

