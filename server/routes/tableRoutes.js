const express = require('express');
const router = express.Router();
const {
  getTables,
  getAssignableWaiters,
  assignTableWaiter,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  getTableQR,
  claimTable,
  heartbeatTable,
  releaseTable,
  clearTableOccupancy,
} = require('../controllers/tableController');
const { protectAdmin, attachAdminIfAuthenticated } = require('../middleware/authMiddleware');
const { requirePinAccess } = require('../middleware/pinAccessMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createTableSchema, updateTableSchema, occupancyActionSchema, assignWaiterSchema } = require('../validations/table.schema');

router
  .route('/')
  .get(attachAdminIfAuthenticated, requirePinAccess, getTables)
  .post(protectAdmin, validate(createTableSchema), createTable);

// Waiter assignment. Declared before '/:id' so the literal 'waiters' segment is
// not captured as a table id. Admin-only: a waiter can never hand a table to
// somebody else, including themselves.
router.get('/waiters', protectAdmin, getAssignableWaiters);
router.put('/:id/waiter', protectAdmin, validate(assignWaiterSchema), assignTableWaiter);

router
  .route('/:id')
  .get(attachAdminIfAuthenticated, requirePinAccess, getTableById)
  .put(protectAdmin, validate(updateTableSchema), updateTable)
  .delete(protectAdmin, deleteTable);

router.get('/:id/qr', protectAdmin, getTableQR);

// One-person-per-table occupancy. Claim / heartbeat / release are used by the
// customer's QR session; the DELETE is the staff force-free override.
router.post('/:id/claim', requirePinAccess, validate(occupancyActionSchema), claimTable);
router.post('/:id/heartbeat', requirePinAccess, validate(occupancyActionSchema), heartbeatTable);
router.post('/:id/release', requirePinAccess, validate(occupancyActionSchema), releaseTable);
router.delete('/:id/occupancy', protectAdmin, clearTableOccupancy);

module.exports = router;

