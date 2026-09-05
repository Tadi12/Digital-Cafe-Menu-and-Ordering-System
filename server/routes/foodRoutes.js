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
const { protectAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router
  .route('/')
  .get(getFoods)
  .post(protectAdmin, upload.single('image'), createFood);

router
  .route('/:id')
  .get(getFoodById)
  .put(protectAdmin, upload.single('image'), updateFood)
  .delete(protectAdmin, deleteFood);

router.patch('/:id/toggle-availability', protectAdmin, toggleFoodAvailability);

module.exports = router;
