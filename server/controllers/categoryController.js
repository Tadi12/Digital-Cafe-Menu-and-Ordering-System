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

    const filter = type
      ? {
          $or: [
            { type },
            { type: { $exists: false } },
            { type: null },
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

    if (!['food', 'drink'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Category type must be either food or drink',
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
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (nameEn) category.name.en = nameEn;
    if (nameAm) category.name.am = nameAm;
    if (type && ['food', 'drink'].includes(type)) {
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
      return res.status(404).json({ success: false, message: 'Category not found' });
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
