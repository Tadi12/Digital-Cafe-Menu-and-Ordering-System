const { z } = require('zod');

const createFoodSchema = z.object({
  body: z.object({
    nameEn: z.string().min(1, 'Food English name is required'),
    nameAm: z.string().min(1, 'Food Amharic name is required'),
    price: z.number().positive('Price must be a positive number').or(z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number)),
    ingredientsEn: z.array(z.string()).optional().or(z.string().optional()),
    ingredientsAm: z.array(z.string()).optional().or(z.string().optional()),
    category: z.string().min(1, 'Category is required'),
    available: z.boolean().optional().or(z.string().transform(val => val === 'true')),
    image: z.any().optional(),
  }),
});

const updateFoodSchema = z.object({
  body: z.object({
    nameEn: z.string().min(1).optional(),
    nameAm: z.string().min(1).optional(),
    price: z.number().positive().or(z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number)).optional(),
    ingredientsEn: z.array(z.string()).optional().or(z.string().optional()),
    ingredientsAm: z.array(z.string()).optional().or(z.string().optional()),
    category: z.string().min(1).optional(),
    available: z.boolean().optional().or(z.string().transform(val => val === 'true').optional()),
    image: z.any().optional(),
  }),
});

module.exports = {
  createFoodSchema,
  updateFoodSchema,
};
