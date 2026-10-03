const { ERROR_CODES } = require('../utils/errorCodes');
const CafeSettings = require('../models/CafeSettings');

const requirePinAccess = async (req, res, next) => {
  // A successfully authenticated administrator may use shared read endpoints
  if (req.user || req.admin) return next();

  try {
    const settings = await CafeSettings.findOne().lean();
    if (!settings || !settings.accessPin) {
      // If no PIN is configured, allow access
      return next();
    }
    
    const clientPin = req.get('x-client-pin');
    
    if (clientPin === settings.accessPin) {
      return next();
    }
    
    return res.status(403).json({ success: false, code: ERROR_CODES.PIN_REQUIRED, message: 'Invalid or missing PIN.' });
  } catch (error) {
    console.error('[PIN Access] Internal Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error verifying PIN.' });
  }
};

module.exports = {
  requirePinAccess,
};


