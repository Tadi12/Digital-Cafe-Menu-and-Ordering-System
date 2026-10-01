const express = require('express');
const router = express.Router();
const {
  getTables,
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
const validate = require('../middleware/validateMiddleware');
const { createTableSchema, updateTableSchema, occupancyActionSchema } = require('../validations/table.schema');

router
  .route('/')
  .get(getTables)
  .post(protectAdmin, validate(createTableSchema), createTable);

router
  .route('/:id')
  .get(attachAdminIfAuthenticated, getTableById)
  .put(protectAdmin, validate(updateTableSchema), updateTable)
  .delete(protectAdmin, deleteTable);

router.get('/:id/qr', protectAdmin, getTableQR);

// One-person-per-table occupancy. Claim / heartbeat / release are used by the
// customer's QR session; the DELETE is the staff force-free override.
router.post('/:id/claim', validate(occupancyActionSchema), claimTable);
router.post('/:id/heartbeat', validate(occupancyActionSchema), heartbeatTable);
router.post('/:id/release', validate(occupancyActionSchema), releaseTable);
router.delete('/:id/occupancy', protectAdmin, clearTableOccupancy);

module.exports = router;

