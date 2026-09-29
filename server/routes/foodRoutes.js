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
const { requireCafeWifi } = require('../middleware/cafeWifiMiddleware');
const upload = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createFoodSchema, updateFoodSchema } = require('../validations/food.schema');

router
  .route('/')
  .get(attachAdminIfAuthenticated, requireCafeWifi, getFoods)
  .post(protectAdmin, upload.single('image'), validate(createFoodSchema), createFood);

router
  .route('/:id')
  .get(attachAdminIfAuthenticated, requireCafeWifi, getFoodById)
  .put(protectAdmin, upload.single('image'), validate(updateFoodSchema), updateFood)
  .delete(protectAdmin, deleteFood);

router.patch('/:id/toggle-availability', protectAdmin, toggleFoodAvailability);

module.exports = router;
