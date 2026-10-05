const { ERROR_CODES } = require('../utils/errorCodes');

const Admin = require('../models/Admin');
const AdminSession = require('../models/AdminSession');
const Table = require('../models/Table');
const mongoose = require('mongoose');
const generateToken = require('../utils/generateToken');
const { ROLE_RANK, isStaffEnabled, staffActionRefusal } = require('../utils/staffAccess');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { getIO } = require('../sockets/socketHandler');

const getDeviceName = (userAgent = '') => {
  const ua = userAgent.toLowerCase();
  const browser = ua.includes('edg/') ? 'Microsoft Edge' : ua.includes('firefox/') ? 'Firefox' : ua.includes('chrome/') ? 'Chrome' : ua.includes('safari/') ? 'Safari' : 'Browser';
  const platform = ua.includes('iphone') || ua.includes('ipad') ? 'iPhone / iPad' : ua.includes('android') ? 'Android' : ua.includes('windows') ? 'Windows' : ua.includes('mac os') ? 'Mac' : ua.includes('linux') ? 'Linux' : 'Unknown device';
  return `${browser} on ${platform}`;
};

const getRequestIp = (req) => String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();

/**
 * @desc    Auth Admin & get JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (admin && (await admin.matchPassword(password))) {
      // Checked AFTER the password matched, never before. Answering "disabled"
      // to an unauthenticated caller would turn this endpoint into an account
      // oracle: anybody could learn which emails belong to real staff and which
      // of those are switched off. At this point the caller has already proven
      // they are that person, so naming the real reason is what lets them know
      // to ask a manager for access back.
      if (!isStaffEnabled(admin)) {
        return res.status(403).json({
          success: false,
          code: ERROR_CODES.STAFF_ACCOUNT_DISABLED,
          message: 'This account has been disabled. Please contact an administrator.',
        });
      }

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const userAgent = String(req.get('user-agent') || '');
      const session = await AdminSession.create({
        admin: admin._id,
        deviceName: getDeviceName(userAgent),
        userAgent,
        ipAddress: getRequestIp(req),
        expiresAt,
      });
      return res.json({
        success: true,
        data: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          token: generateToken(admin._id, session._id.toString()),
        },
      });
    } else {
      return res.status(401).json({
        success: false,
        code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      });
    }
  } catch (error) {
    next(error);
  }
};

const getAdminSessions = async (req, res, next) => {
  try {
    const sessions = await AdminSession.find({
      admin: req.user._id,
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).sort({ lastActiveAt: -1 }).lean();
    return res.json({
      success: true,
      data: sessions.map((session) => ({ ...session, isCurrent: session._id.toString() === req.session._id.toString() })),
    });
  } catch (error) {
    next(error);
  }
};

const terminateAdminSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!mongoose.isValidObjectId(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid device session' });
    }
    const session = await AdminSession.findOneAndUpdate(
      { _id: sessionId, admin: req.user._id, isActive: true },
      { isActive: false, revokedAt: new Date() },
      { new: true }
    );
    if (!session) return res.status(404).json({ success: false, message: 'Active device session not found' });
    getIO().to(`admin_session_${session._id.toString()}`).emit('admin_session_terminated');
    return res.json({ success: true, message: 'Device session terminated', data: { isCurrent: session._id.toString() === req.session._id.toString() } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in Admin profile
 * @route   GET /api/auth/me
 * @access  Protected (Admin)
 */
const getAdminProfile = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.user._id).select('-password');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    return res.json({
      success: true,
      data: admin,
    });
  } catch (error) {
    next(error);
  }
};

// Update admin profile controller
/**
 * @desc    Update admin profile
 * @route   PUT /api/auth/me
 * @access  Protected (Admin)
 */
const updateAdminProfile = async (req, res, next) => {
  try {
    const adminId = req.user._id;
    const { name, email, password } = req.body;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // If email is being changed, ensure uniqueness
    if (email && email.toLowerCase() !== admin.email) {
      const emailExists = await Admin.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({ success: false, code: ERROR_CODES.EMAIL_IN_USE, message: 'Email already in use' });
      }
      admin.email = email.toLowerCase();
    }

    if (name) admin.name = name;
    if (password) admin.password = password; // pre-save hook will hash

    await admin.save();

    const updatedAdmin = await Admin.findById(adminId).select('-password');
    return res.json({ success: true, data: updatedAdmin });
  } catch (error) {
    next(error);
  }
};

const getClientBaseUrl = () => {
  const raw = (process.env.CLIENT_URL || 'http://localhost:5173').trim();
  return raw.replace(/\/+$/, '');
};

const isDevelopment = () =>
  String(process.env.NODE_ENV || 'development').toLowerCase() !== 'production';

const forgotPassword = async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    const genericResponse = {
      success: true,
      message: 'If that email address is registered, a password reset link has been sent.',
    };

    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.json(genericResponse);

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    admin.resetTokenHash = resetTokenHash;
    admin.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 mins
    await admin.save({ validateBeforeSave: false });

    // Top-level, not /admin/...: password reset is an authentication route, and
    // /admin is a protected application area. Links already sitting in inboxes point
    // at the old /admin/reset-password/:token path, which the client keeps alive with
    // a redirect, so nobody is locked out by the move.
    const resetUrl = `${getClientBaseUrl()}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: admin.email,
        subject: 'Reset your Hable Cafe Admin Password',
        text: `You requested a password reset. Click the link to reset your password: ${resetUrl} \n\nThis link expires in 30 minutes. If you didn't request this, please ignore this email.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your Hable Cafe admin account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3D2314; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
            <p>This link expires in 30 minutes.</p>
            <p style="color: #666; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('[Password Reset] Email API delivery failed:', emailError.message);

      if (isDevelopment()) {
        console.warn('[Password Reset] Development fallback link (valid for 30 minutes):', resetUrl);
        return res.json({
          success: true,
          message:
            'Email delivery is unavailable. Use the reset link printed in the server console (valid for 30 minutes).',
        });
      }

      admin.resetTokenHash = undefined;
      admin.resetTokenExpires = undefined;
      await admin.save({ validateBeforeSave: false });
      return res.status(503).json({
        success: false,
        message: 'We could not send the reset email. Please try again shortly.',
      });
    }

    return res.json(genericResponse);
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const admin = await Admin.findOne({
      resetTokenHash,
      resetTokenExpires: { $gt: Date.now() },
    });

    if (!admin) {
      return res.status(400).json({ success: false, message: 'This password reset link is invalid or has expired' });
    }

    admin.password = password;
    admin.resetTokenHash = undefined;
    admin.resetTokenExpires = undefined;
    await admin.save();
    await AdminSession.updateMany({ admin: admin._id, isActive: true }, { isActive: false, revokedAt: new Date() });

    return res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

const getStaff = async (req, res, next) => {
  try {
    const staff = await Admin.find().select('-password').sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: staff.map(toStaffJSON) });
  } catch (error) {
    next(error);
  }
};

/**
 * The roster's view of a staff account.
 *
 * `isActive` is normalised to a real boolean here rather than passed through, so
 * the client never has to know that accounts predating the field read back as
 * `undefined` and would otherwise render every existing member as disabled.
 */
const toStaffJSON = (admin) => ({
  _id: admin._id,
  name: admin.name,
  email: admin.email,
  role: admin.role,
  isActive: isStaffEnabled(admin),
  createdAt: admin.createdAt,
});

/**
 * Turn a `staffActionRefusal` reason into the 403 the caller should receive.
 *
 * The rule itself — who may manage whom — lives in utils/staffAccess.js so it can
 * be tested without a database. Only the wording lives here.
 *
 * @returns {{status: number, body: object}|null} the response to send, or null if allowed
 */
const refuseUnauthorisedStaffAction = (target, actor) => {
  const reason = staffActionRefusal(target, actor);
  if (!reason) return null;

  const message =
    reason === 'self'
      ? 'You cannot enable, disable or delete your own account'
      : 'You cannot manage a staff account with a higher role than your own';

  return { status: 403, body: { success: false, code: ERROR_CODES.AUTH_FORBIDDEN, message } };
};

/**
 * Revoke every live device session for a staff account and tell those browsers to
 * sign themselves out.
 *
 * Disabling an account has to take effect now, not in 30 days when its token would
 * have expired. Deleting the sessions is what actually revokes the token —
 * `protectAdmin` requires a live session, so there is no surviving credential. The
 * socket emit only saves the browser from having to discover this on its next
 * request; the session rows are the real control.
 */
const revokeStaffSessions = async (adminId) => {
  const sessions = await AdminSession.find({ admin: adminId, isActive: true })
    .select('_id')
    .lean();

  if (!sessions.length) return;

  await AdminSession.updateMany(
    { admin: adminId, isActive: true },
    { isActive: false, revokedAt: new Date() }
  );

  try {
    const io = getIO();
    for (const session of sessions) {
      io.to(`admin_session_${session._id.toString()}`).emit('staff_account_disabled', {
        reason: 'account_disabled',
      });
    }
  } catch (error) {
    // getIO() throws when the socket layer is not running (a script, a test). The
    // sessions are already revoked, so the request has done its job; that browser
    // simply finds out on its next request.
    console.warn('[Staff] Could not notify disabled sessions:', error.message);
  }
};

const createStaff = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // The route already applies requireRole(MANAGEMENT_ROLES); this is the finer
    // check that stops an admin promoting somebody past their own level.
    if (ROLE_RANK[role] > ROLE_RANK[req.user.role]) {
      return res.status(403).json({
        success: false,
        code: ERROR_CODES.AUTH_FORBIDDEN,
        message: 'You cannot create a staff account with a higher role than your own',
      });
    }

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.EMAIL_IN_USE,
        message: 'Email already exists',
      });
    }

    // `role` is required by createStaffSchema, so it is always a validated enum
    // value here — never undefined, and never the model default.
    const staff = await Admin.create({ name, email, password, role });
    res.status(201).json({
      success: true,
      data: toStaffJSON(staff),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle a staff account between enabled and disabled
 * @route   PATCH /api/auth/staff/:id/status
 * @access  Protected (Admin)
 */
const updateStaffStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, code: ERROR_CODES.BAD_REQUEST, message: 'Invalid staff id' });
    }

    const staff = await Admin.findById(id);
    if (!staff) {
      return res.status(404).json({ success: false, code: ERROR_CODES.STAFF_NOT_FOUND, message: 'Staff account not found' });
    }

    const refusal = refuseUnauthorisedStaffAction(staff, req.user);
    if (refusal) return res.status(refusal.status).json(refusal.body);

    staff.isActive = !isStaffEnabled(staff);
    await staff.save();

    // Only revoking on the way down: re-enabling must not be a way to reuse the
    // old sessions, so the previous disable already threw them away.
    if (!staff.isActive) {
      await revokeStaffSessions(staff._id);
    }

    return res.json({
      success: true,
      message: staff.isActive ? 'Staff account enabled' : 'Staff account disabled',
      data: toStaffJSON(staff),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a staff account
 * @route   DELETE /api/auth/staff/:id
 * @access  Protected (Admin)
 */
const deleteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, code: ERROR_CODES.BAD_REQUEST, message: 'Invalid staff id' });
    }

    const staff = await Admin.findById(id);
    if (!staff) {
      return res.status(404).json({ success: false, code: ERROR_CODES.STAFF_NOT_FOUND, message: 'Staff account not found' });
    }

    const refusal = refuseUnauthorisedStaffAction(staff, req.user);
    if (refusal) return res.status(refusal.status).json(refusal.body);

    // Sessions first. They are what authorises the account, so revoking them
    // before the document disappears means there is no window in which a live
    // token still resolves to somebody who is no longer on the roster.
    await revokeStaffSessions(staff._id);

    // Hand back any tables this waiter owned. A table pointing at a deleted
    // account populates as nobody, which is exactly what an unassigned table
    // looks like, so this keeps the floor consistent instead of leaving a
    // reference to a person who no longer exists. Historical orders are
    // deliberately untouched: the cafe keeps its sales record either way.
    await Table.updateMany(
      { assignedWaiter: staff._id },
      { $set: { assignedWaiter: null } }
    );

    await staff.deleteOne();

    return res.json({ success: true, message: 'Staff account deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStaff,
  createStaff,
  updateStaffStatus,
  deleteStaff,
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  getAdminSessions,
  terminateAdminSession,
  forgotPassword,
  resetPassword,
};


