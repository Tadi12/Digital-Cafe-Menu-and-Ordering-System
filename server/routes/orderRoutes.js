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
const { createOrderSchema, updateOrderStatusSchema, updatePreparationSchema } = require('../validations/order.schema');

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

// The FINAL customer order status. Reserved for the waiter and the admin: the
// controller answers 403 to a chef or a barista here, and refuses to complete an
// order while either preparation track is unfinished.
router.patch('/:id/status', protectAdmin, validate(updateOrderStatusSchema), updateOrderStatus);

// PREPARATION tracks. Each station has its own named endpoint, and the track is
// taken from the URL, so the kitchen cannot widen its reach through the body.
// The generic /preparation form keeps the original body-based contract working.
router.patch('/:id/:trackSegment(food-status|drink-status)', protectAdmin, validate(updatePreparationSchema), updatePreparationStatus);
router.patch('/:id/preparation', protectAdmin, validate(updatePreparationSchema), updatePreparationStatus);

// Cancelling needs proof that the caller placed the order: attachAdminIfAuthenticated
// lets signed-in staff cancel on a customer's behalf, and cancelOrder requires the
// customerSessionId otherwise. This used to be reachable by anyone holding the
// shared cafe PIN, which let any customer cancel another customer's pending order.
router.patch('/:id/cancel', attachAdminIfAuthenticated, requirePinAccess, cancelOrder);

module.exports = router;

