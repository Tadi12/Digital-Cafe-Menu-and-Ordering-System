const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protectAdmin, attachAdminIfAuthenticated, requireRole, MANAGEMENT_ROLES } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createCategorySchema, updateCategorySchema } = require('../validations/category.schema');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');
const { requirePinAccess } = require('../middleware/pinAccessMiddleware');

// A category carries its `type` ('food' | 'drink'), which decides which kitchen
// station an order routes to. Only management edits it, for the same reason as the
// menu itself: a wrong type silently sends drink orders to the chef.
router
  .route('/')
  .get(attachAdminIfAuthenticated, requirePinAccess, cacheMiddleware(3600), getCategories) // Cache for 1 hour
  .post(protectAdmin, requireRole(MANAGEMENT_ROLES), upload.single('image'), validate(createCategorySchema), createCategory);

router
  .route('/:id')
  .put(protectAdmin, requireRole(MANAGEMENT_ROLES), upload.single('image'), validate(updateCategorySchema), updateCategory)
  .delete(protectAdmin, requireRole(MANAGEMENT_ROLES), deleteCategory);

module.exports = router;

