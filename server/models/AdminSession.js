const mongoose = require('mongoose');

const adminSessionSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    deviceName: { type: String, trim: true, default: 'Unknown device' },
    userAgent: { type: String, trim: true, default: '' },
    ipAddress: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    lastActiveAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true }
);

adminSessionSchema.index({ admin: 1, isActive: 1, lastActiveAt: -1 });

module.exports = mongoose.model('AdminSession', adminSessionSchema);
