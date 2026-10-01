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

// Occupancy actions (claim / heartbeat / release) are performed by the
// customer's browser session, identified by the persistent session id that
// the client already stores in localStorage for order history.
const occupancyActionSchema = z.object({
  body: z.object({
    customerSessionId: z
      .string()
      .trim()
      .min(1, 'customerSessionId is required')
      .max(200, 'customerSessionId is too long'),
  }),
});

module.exports = {
  createTableSchema,
  updateTableSchema,
  occupancyActionSchema,
};
