const { z } = require('zod');
const { CATEGORY_TYPES } = require('../utils/categoryTypes');

const createCategorySchema = z.object({
  body: z.object({
    // Closed enum sourced from the shared vocabulary, so a type added there is
    // accepted here without a second edit that could be forgotten.
    type: z.enum(CATEGORY_TYPES, {
      required_error: 'Category type is required',
    }).optional().default('food'),
    nameEn: z.string().min(1, 'Category English name is required'),
    nameAm: z.string().min(1, 'Category Amharic name is required'),
    image: z.any().optional(), 
  }),
});

const updateCategorySchema = z.object({
  body: z.object({
    type: z.enum(CATEGORY_TYPES).optional(),
    nameEn: z.string().min(1, 'Category English name is required').optional(),
    nameAm: z.string().min(1, 'Category Amharic name is required').optional(),
    image: z.any().optional(),
  }),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};
