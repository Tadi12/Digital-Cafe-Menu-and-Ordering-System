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
const { requireGeofence } = require('../middleware/geofenceMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createOrderSchema, updateOrderStatusSchema } = require('../validations/order.schema');

router
  .route('/')
  .post(requireGeofence, validate(createOrderSchema), createOrder)
  .get(protectAdmin, getOrders);

router.get('/customer', requireGeofence, getCustomerOrders);
router.get('/customer/:customerName', requireGeofence, getCustomerOrders);
router.get('/:id', attachAdminIfAuthenticated, requireGeofence, getOrderById);
router.patch('/:id/status', protectAdmin, validate(updateOrderStatusSchema), updateOrderStatus);
router.patch('/:id/cancel', requireGeofence, cancelOrder);

module.exports = router;

