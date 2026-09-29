const express = require('express');
const router = express.Router();
const {
  getTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  getTableQR,
} = require('../controllers/tableController');
const { protectAdmin, attachAdminIfAuthenticated } = require('../middleware/authMiddleware');
const { requireGeofence } = require('../middleware/geofenceMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createTableSchema, updateTableSchema } = require('../validations/table.schema');

router
  .route('/')
  .get(getTables)
  .post(protectAdmin, validate(createTableSchema), createTable);

router
  .route('/:id')
  .get(attachAdminIfAuthenticated, requireGeofence, getTableById)
  .put(protectAdmin, validate(updateTableSchema), updateTable)
  .delete(protectAdmin, deleteTable);

router.get('/:id/qr', protectAdmin, getTableQR);

module.exports = router;

