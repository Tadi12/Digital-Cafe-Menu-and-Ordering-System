const { z } = require('zod');

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').min(1, 'Email is required'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').min(1, 'Email is required'),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: z.string().email('Invalid email format').optional(),
    password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
  }),
});

// The role is validated as a closed enum rather than passed through. Before this
// existed, `createStaff` forwarded req.body.role straight to Admin.create, so a
// request that simply OMITTED the field fell through to the model default of
// 'super_admin' — an 'admin' could mint a super admin by accident, and could also
// simply ask for one outright.
const createStaffSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').trim(),
    email: z.string().email('Invalid email format').trim(),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    role: z.enum(['super_admin', 'admin', 'waiter', 'chef', 'barista']),
  }),
});

module.exports = {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  createStaffSchema,
};
