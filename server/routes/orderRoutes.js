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
const { requireGeofenceAccess } = require('../middleware/geofenceMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createOrderSchema, updateOrderStatusSchema } = require('../validations/order.schema');

router
  .route('/')
  .post(requireGeofenceAccess, validate(createOrderSchema), createOrder)
  .get(protectAdmin, getOrders);

router.get('/customer', requireGeofenceAccess, getCustomerOrders);
router.get('/customer/:customerName', requireGeofenceAccess, getCustomerOrders);
router.get('/:id', attachAdminIfAuthenticated, requireGeofenceAccess, getOrderById);
router.patch('/:id/status', protectAdmin, validate(updateOrderStatusSchema), updateOrderStatus);
router.patch('/:id/cancel', requireGeofenceAccess, cancelOrder);

module.exports = router;

