const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, validatePin } = require('../controllers/settingsController');
const { requirePinAccess } = require('../middleware/pinAccessMiddleware');
const { protectAdmin, requireRole, MANAGEMENT_ROLES } = require('../middleware/authMiddleware');

// Rewriting the access PIN and the cafe settings is a management action: the PIN
// is the only thing standing between a passer-by and the whole menu, so a waiter
// or a barista must not be able to change it.
router.get('/', protectAdmin, requireRole(MANAGEMENT_ROLES), getSettings);
router.put('/', protectAdmin, requireRole(MANAGEMENT_ROLES), updateSettings);
router.post('/validate', validatePin);

module.exports = router;
