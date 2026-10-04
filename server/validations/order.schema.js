const { z } = require('zod');

const orderItemSchema = z.object({
  foodId: z.string().min(1, 'Food ID is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

const createOrderSchema = z.object({
  body: z.object({
    customerName: z.string().min(1, 'Customer name is required').trim(),
    customerSessionId: z.string().optional(),
    tableId: z.string().min(1, 'Table reference is required'),
    items: z.array(orderItemSchema).min(1, 'Order must contain at least one item'),
    paymentMethod: z.enum(['Cash', 'Telebirr', 'CBE', 'Dashen', 'Awash', 'BOA', 'Zemen']).optional(),
  }),
});

const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled']),
  }),
});

// Preparation is pending -> preparing -> ready and stops there. 'completed' is not
// an accepted value at all: closing a customer order is a waiter/admin action, and
// rejecting it at the validation layer means a kitchen request carrying it never
// reaches the controller. 'not_required' is likewise not settable — it is decided
// by what the order actually contains.
const updatePreparationSchema = z.object({
  body: z.object({
    // Only needed for the generic /preparation form; the named endpoints take the
    // track from the URL and ignore it.
    track: z.enum(['food', 'drink']).optional(),
    status: z.enum(['pending', 'preparing', 'ready']),
  }),
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  updatePreparationSchema,
};
