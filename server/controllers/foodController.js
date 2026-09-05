const Food = require('../models/Food');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

/**
 * @desc    Get all food items with optional filtering by category, search query, and availability
 * @route   GET /api/foods
 * @access  Public
 */
const getFoods = async (req, res, next) => {
  try {
    const { category, search, available } = req.query;
    let query = {};

    if (category) {
      query.category = category;
    }

    if (available !== undefined) {
      query.available = available === 'true';
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { 'name.en': searchRegex },
        { 'name.am': searchRegex },
        { 'ingredients.en': searchRegex },
        { 'ingredients.am': searchRegex },
      ];
    }

    const foods = await Food.find(query)
      .populate('category', 'name image')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: foods.length,
      data: foods,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single food item details
 * @route   GET /api/foods/:id
 * @access  Public
 */
const getFoodById = async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id).populate('category', 'name image');
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }
    return res.json({
      success: true,
      data: food,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new food item
 * @route   POST /api/foods
 * @access  Protected (Admin)
 */
const createFood = async (req, res, next) => {
  try {
    const { nameEn, nameAm, price, category, ingredientsEn, ingredientsAm, available } = req.body;

    if (!nameEn || !nameAm || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name (EN & AM), price, and category are required fields',
      });
    }

    if (Number(price) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a positive number',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Food image file is required',
      });
    }

    // Parse ingredients arrays (sent as stringified JSON or comma-separated strings)
    let parsedIngredientsEn = [];
    let parsedIngredientsAm = [];

    if (ingredientsEn) {
      parsedIngredientsEn = typeof ingredientsEn === 'string'
        ? ingredientsEn.split(',').map((item) => item.trim()).filter(Boolean)
        : ingredientsEn;
    }

    if (ingredientsAm) {
      parsedIngredientsAm = typeof ingredientsAm === 'string'
        ? ingredientsAm.split(',').map((item) => item.trim()).filter(Boolean)
        : ingredientsAm;
    }

    // Upload image
    const imageResult = await uploadToCloudinary(req.file.path, 'foods');

    const food = await Food.create({
      name: {
        en: nameEn,
        am: nameAm,
      },
      price: Number(price),
      ingredients: {
        en: parsedIngredientsEn,
        am: parsedIngredientsAm,
      },
      image: {
        url: imageResult.url,
        publicId: imageResult.publicId,
      },
      category,
      available: available !== undefined ? available === 'true' || available === true : true,
    });

    const populatedFood = await Food.findById(food._id).populate('category', 'name image');

    return res.status(201).json({
      success: true,
      data: populatedFood,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update food item
 * @route   PUT /api/foods/:id
 * @access  Protected (Admin)
 */
const updateFood = async (req, res, next) => {
  try {
    const { nameEn, nameAm, price, category, ingredientsEn, ingredientsAm, available } = req.body;
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    if (nameEn) food.name.en = nameEn;
    if (nameAm) food.name.am = nameAm;
    if (price !== undefined) {
      if (Number(price) <= 0) {
        return res.status(400).json({ success: false, message: 'Price must be a positive number' });
      }
      food.price = Number(price);
    }
    if (category) food.category = category;
    if (available !== undefined) {
      food.available = available === 'true' || available === true;
    }

    if (ingredientsEn !== undefined) {
      food.ingredients.en = typeof ingredientsEn === 'string'
        ? ingredientsEn.split(',').map((item) => item.trim()).filter(Boolean)
        : ingredientsEn;
    }

    if (ingredientsAm !== undefined) {
      food.ingredients.am = typeof ingredientsAm === 'string'
        ? ingredientsAm.split(',').map((item) => item.trim()).filter(Boolean)
        : ingredientsAm;
    }

    if (req.file) {
      if (food.image.publicId) {
        await deleteFromCloudinary(food.image.publicId);
      }
      const imageResult = await uploadToCloudinary(req.file.path, 'foods');
      food.image = {
        url: imageResult.url,
        publicId: imageResult.publicId,
      };
    }

    const updatedFood = await food.save();
    const populatedFood = await Food.findById(updatedFood._id).populate('category', 'name image');

    return res.json({
      success: true,
      data: populatedFood,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle food availability status
 * @route   PATCH /api/foods/:id/toggle-availability
 * @access  Protected (Admin)
 */
const toggleFoodAvailability = async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    food.available = !food.available;
    await food.save();

    return res.json({
      success: true,
      message: `Food availability changed to ${food.available ? 'Available' : 'Unavailable'}`,
      data: food,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete food item
 * @route   DELETE /api/foods/:id
 * @access  Protected (Admin)
 */
const deleteFood = async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    if (food.image.publicId) {
      await deleteFromCloudinary(food.image.publicId);
    }

    await food.deleteOne();

    return res.json({
      success: true,
      message: 'Food item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFoods,
  getFoodById,
  createFood,
  updateFood,
  toggleFoodAvailability,
  deleteFood,
};
