const express = require('express');
const router = express.Router();
const {
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  getAdminSessions,
  terminateAdminSession,
  forgotPassword,
  resetPassword,
  getStaff,
  createStaff,
} = require('../controllers/authController');
const { protectAdmin, requireRole, MANAGEMENT_ROLES } = require('../middleware/authMiddleware');
const resetRateLimiter = require('../middleware/resetRateLimiter');
const validate = require('../middleware/validateMiddleware');
const {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  createStaffSchema,
} = require('../validations/auth.schema');

router.post('/login', validate(loginSchema), loginAdmin);
router.post('/staff', protectAdmin, requireRole(MANAGEMENT_ROLES), validate(createStaffSchema), createStaff);
router.get('/staff', protectAdmin, requireRole(MANAGEMENT_ROLES), getStaff);
router.post('/forgot-password', resetRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/me', protectAdmin, getAdminProfile);
router.get('/sessions', protectAdmin, getAdminSessions);
router.delete('/sessions/:sessionId', protectAdmin, terminateAdminSession);

router.put('/me', protectAdmin, validate(updateProfileSchema), updateAdminProfile);
module.exports = router;
