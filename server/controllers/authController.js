const Admin = require('../models/Admin');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

const canSendEmail = () => {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM_EMAIL
  );
};

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

const forgotPasswordWithOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const genericResponse = {
      success: true,
      message: 'If that email address is registered, a password reset code has been sent.',
    };

    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    if (!canSendEmail()) {
      console.error('[Password Reset] SMTP is not configured.');
      return res.status(503).json({
        success: false,
        message: 'Password-reset email is not configured. Please contact the administrator.',
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) return res.json(genericResponse);

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    admin.resetOtp = otpHash;
    admin.resetOtpExpires = Date.now() + 15 * 60 * 1000;
    await admin.save({ validateBeforeSave: false });

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
      console.error('[Password Reset] SMTP delivery failed:', emailError.message);
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
  forgotPasswordWithOtp,
  resetPasswordWithOtp,
};
