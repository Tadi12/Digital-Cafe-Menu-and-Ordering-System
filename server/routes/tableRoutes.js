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
const { requireCafeWifi } = require('../middleware/cafeWifiMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createTableSchema, updateTableSchema } = require('../validations/table.schema');

router
  .route('/')
  .get(getTables)
  .post(protectAdmin, validate(createTableSchema), createTable);

router
  .route('/:id')
  .get(attachAdminIfAuthenticated, requireCafeWifi, getTableById)
  .put(protectAdmin, validate(updateTableSchema), updateTable)
  .delete(protectAdmin, deleteTable);

router.get('/:id/qr', protectAdmin, getTableQR);

module.exports = router;
