const { z } = require('zod');

const createCategorySchema = z.object({
  body: z.object({
    type: z.enum(['food', 'drink'], {
      required_error: 'Category type is required',
    }).optional().default('food'),
    nameEn: z.string().min(1, 'Category English name is required'),
    nameAm: z.string().min(1, 'Category Amharic name is required'),
    image: z.any().optional(), 
  }),
});

const updateCategorySchema = z.object({
  body: z.object({
    type: z.enum(['food', 'drink']).optional(),
    nameEn: z.string().min(1, 'Category English name is required').optional(),
    nameAm: z.string().min(1, 'Category Amharic name is required').optional(),
    image: z.any().optional(),
  }),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};
