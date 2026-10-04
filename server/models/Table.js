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
    // The waiter responsible for this table, and therefore for delivering its
    // orders. This is the single source of truth for waiter ownership: an order
    // resolves its responsible waiter through Order -> Table -> assignedWaiter,
    // so a table can never disagree with the orders sitting on it. Null means the
    // table is unassigned and only an admin can see and act on its orders.
    //
    // Reassigning a table moves responsibility for its ACTIVE orders immediately,
    // because ownership is always read through this field rather than snapshotted
    // onto the order. Historical orders are untouched: they still point at the
    // same table, and their data is never rewritten.
    assignedWaiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
      index: true,
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

// Shape returned to staff (admin / the assigned waiter). Adds the waiter
// assignment and the aggregated order counts, which the public shape must never
// expose.
tableSchema.methods.toStaffJSON = function toStaffJSON(extras = {}) {
  return {
    ...this.toPublicJSON(),
    assignedWaiter: this.assignedWaiter || null,
    // Populated on demand by the controller; a bare ObjectId otherwise.
    assignedWaiterName:
      this.assignedWaiter && typeof this.assignedWaiter === 'object'
        ? this.assignedWaiter.name
        : null,
    ...extras,
  };
};

module.exports = mongoose.model('Table', tableSchema);
