const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, validatePin } = require('../controllers/settingsController');
const { requireGeofenceAccess } = require('../middleware/geofenceMiddleware');
const { protectAdmin } = require('../middleware/authMiddleware');

router.get('/', protectAdmin, getSettings);
router.put('/', protectAdmin, updateSettings);
router.post('/validate', requireGeofenceAccess, validatePin);

module.exports = router;
