const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Admin name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Admin email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
    },
    resetTokenHash: String,
    resetTokenExpires: Date,
    role: {
      type: String,
      // 'barista' prepares the drink half of an order; see utils/orderStatus.js.
      enum: ['super_admin', 'admin', 'waiter', 'chef', 'barista'],
      // Least privilege. This used to default to 'super_admin', which meant any
      // creation path that forgot to set a role produced the most powerful
      // account in the system. Every real creation path now sets one explicitly
      // (see validations/auth.schema.js); this is only the safety net.
      default: 'waiter',
    },
    // A disabled account keeps its history, its role and its password but is
    // refused at login and on every authenticated request, and has all of its
    // device sessions revoked. Disabling is the reversible counterpart to
    // deleting: use it for somebody who is off today but still on the roster.
    //
    // NOTE: accounts created before this field have no `isActive` at all, and must
    // keep working. Read it through isStaffEnabled() in utils/staffAccess.js, which
    // treats a missing value as enabled — never test this field directly.
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare password
adminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
