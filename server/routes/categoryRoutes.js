const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protectAdmin, attachAdminIfAuthenticated } = require('../middleware/authMiddleware');
const { requireCafeWifi } = require('../middleware/cafeWifiMiddleware');
const upload = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createCategorySchema, updateCategorySchema } = require('../validations/category.schema');

router
  .route('/')
  .get(attachAdminIfAuthenticated, requireCafeWifi, getCategories)
  .post(protectAdmin, upload.single('image'), validate(createCategorySchema), createCategory);

router
  .route('/:id')
  .put(protectAdmin, upload.single('image'), validate(updateCategorySchema), updateCategory)
  .delete(protectAdmin, deleteCategory);

module.exports = router;
