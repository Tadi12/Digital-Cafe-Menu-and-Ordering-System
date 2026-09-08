const Admin = require('../models/Admin');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

const canSendEmail = () => {
  const provider = (process.env.EMAIL_PROVIDER || '').toLowerCase();

  if (!provider || provider === 'none') {
    return false;
  }

  if (provider === 'resend') {
    return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  }

  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM
  );
};

const allowResetFallback = () =>
  process.env.NODE_ENV === 'development' || process.env.ALLOW_RESET_FALLBACK === 'true';

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
      return res.json({
        success: true,
        data: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          token: generateToken(admin._id),
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

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const genericResponse = {
      success: true,
      message: 'If that email address is registered, a password-reset link has been sent.',
    };

    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    // Always use the same response so this endpoint cannot reveal registered emails.
    if (!admin) return res.json(genericResponse);

    const rawToken = crypto.randomBytes(32).toString('hex');
    admin.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    admin.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await admin.save({ validateBeforeSave: false });

    const clientUrl = process.env.CLIENT_URL;
    if (!clientUrl) throw new Error('CLIENT_URL must be configured to send password-reset emails');
    const resetUrl = `${clientUrl}/admin/reset-password/${rawToken}`;

    if (!canSendEmail()) {
      console.warn('[Password Reset] Email delivery is disabled. Returning reset URL directly.');
      return res.json({
        success: true,
        message: 'Email delivery is disabled in this environment. Use this reset link instead.',
        resetUrl,
      });
    }

    try {
      await sendEmail({
        to: admin.email,
        subject: 'Reset your Hable Cafe admin password',
        text: `A password reset was requested for your Hable Cafe account. Reset it within 15 minutes: ${resetUrl}`,
        html: `<p>A password reset was requested for your Hable Cafe account.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 15 minutes. If you did not request it, you can ignore this email.</p>`,
      });
    } catch (emailError) {
      admin.resetPasswordToken = undefined;
      admin.resetPasswordExpires = undefined;
      await admin.save({ validateBeforeSave: false });

      if (allowResetFallback()) {
        console.warn('[Password Reset Fallback] SMTP email failed. Reset URL fallback enabled.');
        return res.json({
          success: true,
          message: 'Email delivery is unavailable right now. Use the reset link shown in the server logs for this environment.',
          resetUrl,
        });
      }

      throw emailError;
    }

    return res.json(genericResponse);
  } catch (error) {
    next(error);
  }
};

const forgotPasswordWithOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const genericResponse = {
      success: true,
      message: 'If that email address is registered, a password reset code has been sent.',
    };

    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) return res.json(genericResponse);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    admin.resetOtp = otpHash;
    admin.resetOtpExpires = Date.now() + 15 * 60 * 1000;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    await admin.save({ validateBeforeSave: false });

    if (!canSendEmail()) {
      console.warn('[Password Reset] Email delivery is disabled. Returning OTP directly.');
      return res.json({
        success: true,
        message: 'Email delivery is disabled in this environment. Use this OTP to reset your password.',
        otp,
      });
    }

    try {
      await sendEmail({
        to: admin.email,
        subject: 'Your Hable Cafe admin password reset code',
        text: `Your password reset code is ${otp}. It expires in 15 minutes. Do not share this code with anyone.`,
        html: `<p>Your password reset code is <strong>${otp}</strong>.</p><p>It expires in 15 minutes.</p><p>Do not share this code with anyone.</p>`,
      });
    } catch (emailError) {
      admin.resetOtp = undefined;
      admin.resetOtpExpires = undefined;
      await admin.save({ validateBeforeSave: false });

      if (allowResetFallback()) {
        console.warn('[Password Reset Fallback] SMTP email failed. OTP fallback enabled.');
        return res.json({
          success: true,
          message: 'Email delivery is unavailable right now. Use this OTP instead:',
          otp,
        });
      }

      throw emailError;
    }

    return res.json(genericResponse);
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const admin = await Admin.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!admin) {
      return res.status(400).json({ success: false, message: 'This reset link is invalid or has expired' });
    }

    admin.password = password;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    await admin.save();

    return res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    next(error);
  }
};

const resetPasswordWithOtp = async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const admin = await Admin.findOne({
      email: email.toLowerCase().trim(),
      resetOtpExpires: { $gt: Date.now() },
    });

    if (!admin) {
      return res.status(400).json({ success: false, message: 'This OTP is invalid or has expired' });
    }

    const otpHash = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
    if (admin.resetOtp !== otpHash) {
      return res.status(400).json({ success: false, message: 'This OTP is invalid or has expired' });
    }

    admin.password = password;
    admin.resetOtp = undefined;
    admin.resetOtpExpires = undefined;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    await admin.save();

    return res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  forgotPassword,
  forgotPasswordWithOtp,
  resetPassword,
  resetPasswordWithOtp,
};
