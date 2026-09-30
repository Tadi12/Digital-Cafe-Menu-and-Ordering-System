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

const updatePaymentStatusSchema = z.object({
  body: z.object({
    paymentStatus: z.enum(['Unpaid', 'Paid']),
  }),
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
};
