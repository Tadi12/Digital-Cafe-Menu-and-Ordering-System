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
const { protectAdmin, attachAdminIfAuthenticated } = require('../middleware/authMiddleware');
const { requireGeofence } = require('../middleware/geofenceMiddleware');
const upload = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createFoodSchema, updateFoodSchema } = require('../validations/food.schema');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

router
  .route('/')
  .get(attachAdminIfAuthenticated, requireGeofence, cacheMiddleware(600), getFoods) // Cache for 10 minutes
  .post(protectAdmin, upload.single('image'), validate(createFoodSchema), createFood);

router
  .route('/:id')
  .get(attachAdminIfAuthenticated, requireGeofence, cacheMiddleware(600), getFoodById)
  .put(protectAdmin, upload.single('image'), validate(updateFoodSchema), updateFood)
  .delete(protectAdmin, deleteFood);

router.patch('/:id/toggle-availability', protectAdmin, toggleFoodAvailability);

module.exports = router;

