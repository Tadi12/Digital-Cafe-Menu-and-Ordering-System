const express = require('express');
const router = express.Router();
const { loginAdmin, getAdminProfile, updateAdminProfile, forgotPassword, resetPassword } = require('../controllers/authController');
const { protectAdmin } = require('../middleware/authMiddleware');

router.post('/login', loginAdmin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/me', protectAdmin, getAdminProfile);

router.put('/me', protectAdmin, updateAdminProfile);
module.exports = router;
