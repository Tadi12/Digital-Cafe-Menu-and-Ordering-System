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

router
  .route('/')
  .get(getTables)
  .post(protectAdmin, createTable);

router
  .route('/:id')
  .get(attachAdminIfAuthenticated, requireCafeWifi, getTableById)
  .put(protectAdmin, updateTable)
  .delete(protectAdmin, deleteTable);

router.get('/:id/qr', protectAdmin, getTableQR);

module.exports = router;
