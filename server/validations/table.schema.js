const { z } = require('zod');

const createTableSchema = z.object({
  body: z.object({
    tableNumber: z.number().int().positive('Table number must be positive'),
    tableName: z.string().trim().optional(),
    active: z.boolean().optional(),
  }),
});

const updateTableSchema = z.object({
  body: z.object({
    tableNumber: z.number().int().positive().optional(),
    tableName: z.string().trim().optional(),
    active: z.boolean().optional(),
  }),
});

module.exports = {
  createTableSchema,
  updateTableSchema,
};
