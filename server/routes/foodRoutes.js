const express = require('express');
const router = express.Router();
const {
  getFoods,
  getFoodById,
  createFood,
  updateFood,
  toggleFoodAvailability,
  deleteFood,
} = require('../controllers/foodController');
const { protectAdmin, attachAdminIfAuthenticated, requireRole, MANAGEMENT_ROLES } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createFoodSchema, updateFoodSchema } = require('../validations/food.schema');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');
const { requirePinAccess } = require('../middleware/pinAccessMiddleware');

// Reading the menu is public (behind the cafe PIN). Editing it is management-only:
// a kitchen user preparing orders has no business repricing or deleting items.
router
  .route('/')
  .get(attachAdminIfAuthenticated, requirePinAccess, cacheMiddleware(600), getFoods) // Cache for 10 minutes
  .post(protectAdmin, requireRole(MANAGEMENT_ROLES), upload.single('image'), validate(createFoodSchema), createFood);

router
  .route('/:id')
  .get(attachAdminIfAuthenticated, requirePinAccess, cacheMiddleware(600), getFoodById)
  .put(protectAdmin, requireRole(MANAGEMENT_ROLES), upload.single('image'), validate(updateFoodSchema), updateFood)
  .delete(protectAdmin, requireRole(MANAGEMENT_ROLES), deleteFood);

router.patch('/:id/toggle-availability', protectAdmin, requireRole(MANAGEMENT_ROLES), toggleFoodAvailability);

module.exports = router;

