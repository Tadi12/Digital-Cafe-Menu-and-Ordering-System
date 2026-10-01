const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: Number,
      required: [true, 'Table number is required'],
      unique: true,
      min: [1, 'Table number must be positive'],
    },
    tableName: {
      type: String,
      default: '',
      trim: true,
    },
    qrCodeUrl: {
      type: String,
      default: '',
    },
    active: {
      type: Boolean,
      default: true,
    },
    // One-person-at-a-time occupancy lock. A customer session "claims" the
    // table when it scans the QR code. The claim is renewed by heartbeats
    // while the menu is open and expires automatically (TTL) once the
    // customer stops sending heartbeats (closed the tab, lost network, etc.).
    occupiedBy: {
      type: String,
      default: null,
      trim: true,
    },
    occupiedAt: {
      type: Date,
      default: null,
    },
    occupancyExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// A table counts as occupied only while its claim has not expired. Expired
// claims are treated as free so an abandoned session never blocks a table.
tableSchema.methods.isOccupiedNow = function isOccupiedNow(now = new Date()) {
  if (!this.occupiedBy) return false;
  if (!this.occupancyExpiresAt) return true;
  return this.occupancyExpiresAt.getTime() > now.getTime();
};

// Shape returned to public/customers: occupancy status without leaking the
// raw session id of the guest currently using the table.
tableSchema.methods.toPublicJSON = function toPublicJSON() {
  const occupied = this.isOccupiedNow();
  return {
    _id: this._id,
    tableNumber: this.tableNumber,
    tableName: this.tableName,
    qrCodeUrl: this.qrCodeUrl,
    active: this.active,
    occupied,
    occupiedAt: occupied ? this.occupiedAt : null,
    occupancyExpiresAt: occupied ? this.occupancyExpiresAt : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Table', tableSchema);
