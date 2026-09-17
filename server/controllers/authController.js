const Admin = require('../models/Admin');
const AdminSession = require('../models/AdminSession');
const mongoose = require('mongoose');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

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
        return res.status(400).json({ success: false, message: 'Email already in use' });
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

    const resetUrl = `${getClientBaseUrl()}/admin/reset-password/${resetToken}`;

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

    return res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  getAdminSessions,
  terminateAdminSession,
  forgotPassword,
  resetPassword,
};
