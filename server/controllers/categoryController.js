const { clearCache, MENU_CACHE_PATTERN } = require('../middleware/cacheMiddleware');
const { ERROR_CODES } = require('../utils/errorCodes');
const { CATEGORY_TYPES, typesForQuery } = require('../utils/categoryTypes');
const Category = require('../models/Category');
const Food = require('../models/Food');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
const getCategories = async (req, res, next) => {
  try {
    const { type } = req.query;

    // `type` names a menu SECTION or a single category type, so it expands to
    // every type it covers. Without the expansion, `?type=food` matched only
    // `type === 'food'` and an extras category was invisible to the food manager —
    // the category existed, the chef could prepare its items, and no screen showed
    // it. See utils/categoryTypes.js.
    const wanted = typesForQuery(type);
    const filter = wanted.length
      ? {
          $or: [
            { type: { $in: wanted } },
            // A category with no type predates the field and is normalised to
            // 'food' on the way out, so it belongs to the food section only. It
            // used to be ORed in for EVERY type, which listed legacy food
            // categories under "Drink" as well.
            ...(wanted.includes('food')
              ? [{ type: { $exists: false } }, { type: null }]
              : []),
          ],
        }
      : {};

    const categories = await Category.find(filter).sort({ createdAt: -1 });

    const normalizedCategories = categories.map((category) => ({
      ...category.toObject(),
      type: category.type || 'food',
    }));

    return res.json({
      success: true,
      count: normalizedCategories.length,
      data: normalizedCategories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new category
 * @route   POST /api/categories
 * @access  Protected (Admin)
 */
const createCategory = async (req, res, next) => {
  try {
    const { nameEn, nameAm, type = 'food' } = req.body;

    if (!nameEn || !nameAm) {
      return res.status(400).json({
        success: false,
        message: 'Category names in both English and Amharic are required',
      });
    }

    if (!CATEGORY_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Category type must be one of: ${CATEGORY_TYPES.join(', ')}`,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Category image file is required',
      });
    }

    const imageResult = await uploadToCloudinary(req.file.path, 'categories');

    const category = await Category.create({
      type,
      name: {
        en: nameEn,
        am: nameAm,
      },
      image: {
        url: imageResult.url,
        publicId: imageResult.publicId,
      },
    });

    await clearCache(MENU_CACHE_PATTERN);
    return res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Protected (Admin)
 */
const updateCategory = async (req, res, next) => {
  try {
    const { nameEn, nameAm, type } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, code: ERROR_CODES.CATEGORY_NOT_FOUND, message: 'Category not found' });
    }

    if (nameEn) category.name.en = nameEn;
    if (nameAm) category.name.am = nameAm;
    if (type && CATEGORY_TYPES.includes(type)) {
      category.type = type;
    }

    if (req.file) {
      if (category.image.publicId) {
        await deleteFromCloudinary(category.image.publicId);
      }
      const imageResult = await uploadToCloudinary(req.file.path, 'categories');
      category.image = {
        url: imageResult.url,
        publicId: imageResult.publicId,
      };
    }

    const updatedCategory = await category.save();

    // A category rename/type change is also baked into every cached /api/foods
    // payload (they populate the owning category), hence the whole namespace.
    await clearCache(MENU_CACHE_PATTERN);
    return res.json({
      success: true,
      data: updatedCategory,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/categories/:id
 * @access  Protected (Admin)
 */
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, code: ERROR_CODES.CATEGORY_NOT_FOUND, message: 'Category not found' });
    }

    const associatedFoodsCount = await Food.countDocuments({ category: category._id });
    if (associatedFoodsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${associatedFoodsCount} menu items are linked to this category`,
      });
    }

    // Delete image from Cloudinary / Local
    if (category.image.publicId) {
      await deleteFromCloudinary(category.image.publicId);
    }

    await category.deleteOne();

    await clearCache(MENU_CACHE_PATTERN);
    return res.json({
      success: true,
      message: 'Category removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};

