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

router
  .route('/')
  .get(attachAdminIfAuthenticated, requireCafeWifi, getFoods)
  .post(protectAdmin, upload.single('image'), createFood);

router
  .route('/:id')
  .get(attachAdminIfAuthenticated, requireCafeWifi, getFoodById)
  .put(protectAdmin, upload.single('image'), updateFood)
  .delete(protectAdmin, deleteFood);

router.patch('/:id/toggle-availability', protectAdmin, toggleFoodAvailability);

module.exports = router;
