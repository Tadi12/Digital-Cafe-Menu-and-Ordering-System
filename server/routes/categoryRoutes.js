const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protectAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router
  .route('/')
  .get(getCategories)
  .post(protectAdmin, upload.single('image'), createCategory);

router
  .route('/:id')
  .put(protectAdmin, upload.single('image'), updateCategory)
  .delete(protectAdmin, deleteCategory);

module.exports = router;
