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
const {
  protectAdmin,
  attachAdminIfAuthenticated,
  requireRole,
  MANAGEMENT_ROLES,
  ALL_ROLES,
} = require('../middleware/authMiddleware');
const { requirePinAccess } = require('../middleware/pinAccessMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createTableSchema, updateTableSchema, occupancyActionSchema, assignWaiterSchema } = require('../validations/table.schema');

router
  .route('/')
  .get(attachAdminIfAuthenticated, requirePinAccess, getTables)
  .post(protectAdmin, requireRole(MANAGEMENT_ROLES), validate(createTableSchema), createTable);

// Waiter assignment. Declared before '/:id' so the literal 'waiters' segment is
// not captured as a table id. requireRole is what actually enforces the comment
// below: a waiter can never hand a table to somebody else, including themselves.
router.get('/waiters', protectAdmin, requireRole(MANAGEMENT_ROLES), getAssignableWaiters);
router.put('/:id/waiter', protectAdmin, requireRole(MANAGEMENT_ROLES), validate(assignWaiterSchema), assignTableWaiter);

router
  .route('/:id')
  .get(attachAdminIfAuthenticated, requirePinAccess, getTableById)
  .put(protectAdmin, requireRole(MANAGEMENT_ROLES), validate(updateTableSchema), updateTable)
  .delete(protectAdmin, requireRole(MANAGEMENT_ROLES), deleteTable);

// The printed QR code is a management artefact, not something the floor needs.
router.get('/:id/qr', protectAdmin, requireRole(MANAGEMENT_ROLES), getTableQR);

// One-person-per-table occupancy. Claim / heartbeat / release are used by the
// customer's QR session; the DELETE is the staff force-free override, which any
// signed-in role may perform — a waiter clearing a dirty table is floor work.
router.post('/:id/claim', requirePinAccess, validate(occupancyActionSchema), claimTable);
router.post('/:id/heartbeat', requirePinAccess, validate(occupancyActionSchema), heartbeatTable);
router.post('/:id/release', requirePinAccess, validate(occupancyActionSchema), releaseTable);
router.delete('/:id/occupancy', protectAdmin, requireRole(ALL_ROLES), clearTableOccupancy);

module.exports = router;

