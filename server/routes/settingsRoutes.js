const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, validatePin } = require('../controllers/settingsController');
const { requirePinAccess } = require('../middleware/pinAccessMiddleware');
const { protectAdmin } = require('../middleware/authMiddleware');

router.get('/', protectAdmin, getSettings);
router.put('/', protectAdmin, updateSettings);
router.post('/validate', validatePin);

module.exports = router;
