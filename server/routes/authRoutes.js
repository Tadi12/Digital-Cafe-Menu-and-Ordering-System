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
  updateStaffStatus,
  deleteStaff,
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
// Both are management-only for the same reason as creating staff, and both
// re-check the caller's rank in the controller: an 'admin' must not be able to
// disable or delete a 'super_admin', nor their own account.
router.patch('/staff/:id/status', protectAdmin, requireRole(MANAGEMENT_ROLES), updateStaffStatus);
router.delete('/staff/:id', protectAdmin, requireRole(MANAGEMENT_ROLES), deleteStaff);
router.post('/forgot-password', resetRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/me', protectAdmin, getAdminProfile);
router.get('/sessions', protectAdmin, getAdminSessions);
router.delete('/sessions/:sessionId', protectAdmin, terminateAdminSession);

router.put('/me', protectAdmin, validate(updateProfileSchema), updateAdminProfile);
module.exports = router;
