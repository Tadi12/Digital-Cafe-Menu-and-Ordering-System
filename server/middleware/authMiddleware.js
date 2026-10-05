const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const AdminSession = require('../models/AdminSession');
const { ERROR_CODES } = require('../utils/errorCodes');
const { isStaffEnabled } = require('../utils/staffAccess');

/**
 * Roles that manage the cafe itself: the catalogue, the floor plan, the staff
 * roster, the access PIN and the revenue numbers.
 *
 * Kept as one exported constant so a new management route cannot accidentally
 * widen the list, and so this file is the single authority for the hierarchy.
 * Mirrors the `roles` arrays the client sidebar already filters on — see
 * client/src/components/admin/AdminSidebar.jsx.
 */
const MANAGEMENT_ROLES = ['super_admin', 'admin'];

/** Every role that can sign in to a staff area. */
const ALL_ROLES = ['super_admin', 'admin', 'waiter', 'chef', 'barista'];

const touchSession = async (session) => {
  if (session.lastActiveAt && Date.now() - session.lastActiveAt.getTime() < 5 * 60 * 1000) return;
  await AdminSession.updateOne({ _id: session._id }, { lastActiveAt: new Date() });
};

const protectAdmin = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded.sessionId) {
        return res.status(401).json({ success: false, message: 'Not authorized, session is invalid' });
      }
      req.user = await Admin.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Admin account not found' });
      }

      // Checked on every request, not only at login. Disabling an account is
      // meant to take effect now, so an already-signed-in browser with a live
      // session must lose access on its next call rather than at token expiry.
      // 401 (not 403) so the client's global interceptor drops the stored token
      // and the account is fully signed out, while the code still tells the UI
      // the real reason.
      if (!isStaffEnabled(req.user)) {
        return res.status(401).json({
          success: false,
          code: ERROR_CODES.STAFF_ACCOUNT_DISABLED,
          message: 'This account has been disabled',
        });
      }

      const session = await AdminSession.findOne({
        _id: decoded.sessionId,
        admin: req.user._id,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });
      if (!session) {
        return res.status(401).json({ success: false, message: 'This device session has been terminated' });
      }
      req.session = session;
      await touchSession(session);

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
    if (!decoded.sessionId) return next();
    const admin = await Admin.findById(decoded.id).select('-password');
    // A disabled account is treated exactly like no token at all. It simply
    // never becomes req.user, so the shared public routes fall through to the
    // customer path instead of quietly granting staff access.
    if (!isStaffEnabled(admin)) return next();
    const session = admin && await AdminSession.findOne({
      _id: decoded.sessionId,
      admin: admin._id,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });
    if (admin && session) {
      req.user = admin;
      req.session = session;
      await touchSession(session);
    }
  } catch (error) {
    // This route can also be a customer route. Do not turn a bad admin token
    // into an authorization bypass; the Wi-Fi middleware will still run.
  }

  return next();
};

// Role-based authorization, applied AFTER protectAdmin on routes that only a
// subset of staff may reach.
//
// This exists because protectAdmin only answers "is this a valid, live session?" —
// it never looks at req.user.role. Without this gate a waiter or a barista token
// could rewrite the access PIN or delete the menu. The role is read from the
// database document that protectAdmin loaded, never from the request body or a
// header, so it cannot be forged.
const requireRole = (...allowed) => {
  // flat(Infinity) so this accepts requireRole(A), requireRole(A, B) and
  // requireRole([A, B]) identically — callers pass the exported role lists around.
  const allowedRoles = allowed.flat(Infinity);

  return (req, res, next) => {
    // Reaching this without protectAdmin in front of it is a wiring mistake, not
    // a client error. Fail closed rather than treating it as "no role set".
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: ERROR_CODES.AUTH_REQUIRED,
        message: 'Not authorized, no token provided',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: ERROR_CODES.AUTH_FORBIDDEN,
        message: 'You do not have permission to perform this action',
      });
    }

    return next();
  };
};

module.exports = { protectAdmin, attachAdminIfAuthenticated, requireRole, MANAGEMENT_ROLES, ALL_ROLES };
