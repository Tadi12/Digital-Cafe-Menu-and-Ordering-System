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
const { protectAdmin } = require('../middleware/authMiddleware');

router
  .route('/')
  .get(getTables)
  .post(protectAdmin, createTable);

router
  .route('/:id')
  .get(getTableById)
  .put(protectAdmin, updateTable)
  .delete(protectAdmin, deleteTable);

router.get('/:id/qr', protectAdmin, getTableQR);

module.exports = router;
