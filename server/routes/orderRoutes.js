const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getWaiterTables,
  getTableOrders,
  getCustomerOrders,
  getOrderById,
  updateOrderStatus,
  updatePreparationStatus,
  cancelOrder,
} = require('../controllers/orderController');
const { protectAdmin, attachAdminIfAuthenticated } = require('../middleware/authMiddleware');
const { requirePinAccess } = require('../middleware/pinAccessMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createOrderSchema, updateOrderStatusSchema } = require('../validations/order.schema');

router
  .route('/')
  .post(requirePinAccess, validate(createOrderSchema), createOrder)
  .get(protectAdmin, getOrders);

router.get('/customer', requirePinAccess, getCustomerOrders);
router.get('/customer/:customerName', requirePinAccess, getCustomerOrders);

// Waiter station endpoints. Declared before '/:id' so the literal 'waiter' segment
// is not swallowed by the order-id parameter.
router.get('/waiter/tables', protectAdmin, getWaiterTables);
router.get('/waiter/tables/:tableId/orders', protectAdmin, getTableOrders);

router.get('/:id', attachAdminIfAuthenticated, requirePinAccess, getOrderById);
router.patch('/:id/status', protectAdmin, validate(updateOrderStatusSchema), updateOrderStatus);
// Preparation track endpoint for the chef and the barista. The role check lives in
// the controller (it has to distinguish food from drink), so this route only needs
// the same protectAdmin every other staff route uses.
router.patch('/:id/preparation', protectAdmin, updatePreparationStatus);
router.patch('/:id/cancel', requirePinAccess, cancelOrder);

module.exports = router;

