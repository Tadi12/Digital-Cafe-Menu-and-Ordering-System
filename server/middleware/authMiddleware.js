const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const protectAdmin = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await Admin.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Admin account not found' });
      }

      return next();
    } catch (error) {
      console.error('[Auth Middleware Error]:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

// Shared read endpoints are used by both customers and the admin UI. This
// silently attaches a valid admin user when present so the Wi-Fi middleware can
// leave admin management access unaffected; protected admin routes still use
// protectAdmin and continue to reject missing/invalid tokens.
const attachAdminIfAuthenticated = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) return next();

  try {
    const token = authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select('-password');
    if (admin) req.user = admin;
  } catch (error) {
    // This route can also be a customer route. Do not turn a bad admin token
    // into an authorization bypass; the Wi-Fi middleware will still run.
  }

  return next();
};

module.exports = { protectAdmin, attachAdminIfAuthenticated };
