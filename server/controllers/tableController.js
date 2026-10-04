const { ERROR_CODES } = require('../utils/errorCodes');
const Table = require('../models/Table');
const Admin = require('../models/Admin');
const { generateTableQRCode } = require('../services/qrService');

/**
 * List the waiters a table can be assigned to.
 *
 * Only role='waiter' accounts are returned, which is what keeps the assignment
 * dropdown from offering a chef, a barista or another admin as a table owner.
 * Passwords are never selected.
 */
const getAssignableWaiters = async (req, res, next) => {
  try {
    const waiters = await Admin.find({ role: 'waiter' })
      .select('name email role')
      .sort({ name: 1 });

    return res.json({
      success: true,
      count: waiters.length,
      data: waiters,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign, change or clear the waiter responsible for a table.
 *
 * Ownership lives on the table, so this single write is what moves an active
 * order's responsibility: the order itself is never rewritten, and historical
 * orders are never touched. Passing an empty/null waiterId unassigns the table.
 */
const assignTableWaiter = async (req, res, next) => {
  try {
    const { waiterId } = req.body || {};

    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({
        success: false,
        code: ERROR_CODES.TABLE_NOT_FOUND,
        message: 'Table not found',
      });
    }

    // Unassign: an explicit, supported action rather than a client-side guess.
    const requestedId = typeof waiterId === 'string' ? waiterId.trim() : '';
    if (!requestedId) {
      table.assignedWaiter = null;
      const updated = await table.save();
      return res.json({
        success: true,
        message: `Table #${table.tableNumber} is now unassigned.`,
        data: updated.toStaffJSON(),
      });
    }

    const waiter = await Admin.findById(requestedId).select('name role');
    if (!waiter) {
      return res.status(404).json({
        success: false,
        code: ERROR_CODES.NOT_FOUND,
        message: 'The selected staff member was not found.',
      });
    }

    // The dropdown only offers waiters, but the API enforces it too: a chef or an
    // admin can never be made responsible for a table by calling the endpoint
    // directly.
    if (waiter.role !== 'waiter') {
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.BAD_REQUEST,
        message: 'Only accounts with the waiter role can be assigned to a table.',
      });
    }

    table.assignedWaiter = waiter._id;
    const updated = await table.save();

    return res.json({
      success: true,
      message: `Table #${table.tableNumber} assigned to ${waiter.name}.`,
      data: updated.toStaffJSON({ assignedWaiterName: waiter.name }),
    });
  } catch (error) {
    if (error.name === 'CastError' || error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.BAD_REQUEST,
        message: 'Invalid table or staff ID format.',
      });
    }
    next(error);
  }
};

/**
 * @desc    Get all café tables
 * @route   GET /api/tables
 * @access  Public / Protected
 *
 * The public/customer shape deliberately omits who is responsible for the table.
 * An authenticated staff member additionally gets the assignment, so the same
 * route can back the admin's "Table 1 -> Abebe" view without a second request.
 */
const getTables = async (req, res, next) => {
  try {
    const tables = await Table.find({})
      .sort({ tableNumber: 1 })
      .populate('assignedWaiter', 'name role');

    const isStaff = Boolean(req.user);

    return res.json({
      success: true,
      count: tables.length,
      data: tables.map((table) =>
        // Never leak staff identities (or their emails) to a customer scanning a QR.
        isStaff ? table.toStaffJSON() : table.toPublicJSON(),
      ),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single table details & validate existence/active status for QR customer access
 * @route   GET /api/tables/:id
 * @access  Public
 */
const getTableById = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found. Please scan a valid café table QR code.',
      });
    }

    if (!table.active) {
      return res.status(400).json({
        success: false,
        message: `Table #${table.tableNumber} is currently inactive or out of service.`,
        data: table.toPublicJSON(),
      });
    }

    return res.json({
      success: true,
      data: table.toPublicJSON(),
    });
  } catch (error) {
    if (error.name === 'CastError' || error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Table ID format. Please scan a valid café table QR code.',
      });
    }
    next(error);
  }
};

/**
 * @desc    Create new table & generate unique QR code
 * @route   POST /api/tables
 * @access  Protected (Admin)
 */
const createTable = async (req, res, next) => {
  try {
    const { tableNumber, tableName, active } = req.body;

    if (!tableNumber || Number(tableNumber) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid table number is required',
      });
    }

    // Check uniqueness
    const existingTable = await Table.findOne({ tableNumber: Number(tableNumber) });
    if (existingTable) {
      return res.status(400).json({
        success: false,
        message: `Table number #${tableNumber} already exists. Table numbers must be unique.`,
      });
    }

    const table = new Table({
      tableNumber: Number(tableNumber),
      tableName: tableName || `Table ${tableNumber}`,
      active: active !== undefined ? active : true,
    });

    await table.save();

    // Auto-generate QR code data URI
    const qrCodeUrl = await generateTableQRCode(table._id);
    table.qrCodeUrl = qrCodeUrl;
    await table.save();

    return res.status(201).json({
      success: true,
      data: table,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update table info or active state
 * @route   PUT /api/tables/:id
 * @access  Protected (Admin)
 */
const updateTable = async (req, res, next) => {
  try {
    const { tableNumber, tableName, active } = req.body;
    const table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({ success: false, code: ERROR_CODES.TABLE_NOT_FOUND, message: 'Table not found' });
    }

    if (tableNumber && Number(tableNumber) !== table.tableNumber) {
      const existingTable = await Table.findOne({ tableNumber: Number(tableNumber) });
      if (existingTable) {
        return res.status(400).json({
          success: false,
          message: `Table number #${tableNumber} already exists.`,
        });
      }
      table.tableNumber = Number(tableNumber);
    }

    if (tableName !== undefined) table.tableName = tableName;
    if (active !== undefined) table.active = active;

    // Regenerate QR Code in case URL parameters change
    const qrCodeUrl = await generateTableQRCode(table._id);
    table.qrCodeUrl = qrCodeUrl;

    const updatedTable = await table.save();

    return res.json({
      success: true,
      data: updatedTable,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete table
 * @route   DELETE /api/tables/:id
 * @access  Protected (Admin)
 */
const deleteTable = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ success: false, code: ERROR_CODES.TABLE_NOT_FOUND, message: 'Table not found' });
    }

    await table.deleteOne();

    return res.json({
      success: true,
      message: `Table #${table.tableNumber} removed successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Re-generate or download Table QR Code
 * @route   GET /api/tables/:id/qr
 * @access  Protected (Admin)
 */
const getTableQR = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ success: false, code: ERROR_CODES.TABLE_NOT_FOUND, message: 'Table not found' });
    }

    if (!table.qrCodeUrl) {
      table.qrCodeUrl = await generateTableQRCode(table._id);
      await table.save();
    }

    return res.json({
      success: true,
      data: {
        tableId: table._id,
        tableNumber: table.tableNumber,
        qrCodeUrl: table.qrCodeUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Table occupancy — one customer session per table at a time
// ---------------------------------------------------------------------------

// How long a claim survives without a heartbeat. Defaults to 10 minutes so an
// abandoned session (closed browser, dead phone, lost Wi-Fi) frees the table
// quickly, while active customers keep it alive with 60-second heartbeats.
const getOccupancyTtlMs = () => {
  const configured = Number(process.env.TABLE_OCCUPANCY_TTL_MS);
  if (Number.isFinite(configured) && configured >= 60 * 1000) {
    return configured;
  }
  return 10 * 60 * 1000;
};

const normalizeSessionId = (value) =>
  typeof value === 'string' ? value.trim() : '';

const clearOccupancyFields = {
  occupiedBy: null,
  occupiedAt: null,
  occupancyExpiresAt: null,
};

/**
 * @desc    Claim a table for the scanning customer session (exclusive access)
 * @route   POST /api/tables/:id/claim
 * @access  Public
 */
const claimTable = async (req, res, next) => {
  try {
    const customerSessionId = normalizeSessionId(req.body?.customerSessionId);
    if (!customerSessionId) {
      return res.status(400).json({
        success: false,
        message: 'customerSessionId is required to claim a table.',
      });
    }

    const table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found. Please scan a valid café table QR code.',
      });
    }

    if (!table.active) {
      return res.status(400).json({
        success: false,
        message: `Table #${table.tableNumber} is currently inactive or out of service.`,
        data: table.toPublicJSON(),
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + getOccupancyTtlMs());

    // Atomic compare-and-set: the table can only be claimed when it is free,
    // already held by this same session (re-scan / refresh), or its previous
    // claim has expired. Two devices scanning at the same moment cannot both
    // win because findOneAndUpdate matches the filter and updates in one step.
    const claimedTable = await Table.findOneAndUpdate(
      {
        _id: table._id,
        $or: [
          { occupiedBy: { $in: [null, ''] } },
          { occupiedBy: customerSessionId },
          { occupancyExpiresAt: { $lte: now } },
          { occupancyExpiresAt: null },
        ],
      },
      {
        $set: {
          occupiedBy: customerSessionId,
          occupiedAt: now,
          occupancyExpiresAt: expiresAt,
        },
      },
      { new: true },
    );

    if (!claimedTable) {
      const currentTable = (await Table.findById(req.params.id)) || table;
      return res.status(409).json({
        success: false,
        code: ERROR_CODES.TABLE_OCCUPIED,
        message: `Table #${currentTable.tableNumber} is currently in use by another guest. Please wait for them to finish, or scan the QR code at another free table.`,
        data: currentTable.toPublicJSON(),
      });
    }

    // A session may only hold one table at a time: if this guest moved to a
    // different table, free the one they claimed earlier.
    await Table.updateMany(
      { occupiedBy: customerSessionId, _id: { $ne: claimedTable._id } },
      { $set: clearOccupancyFields },
    );

    return res.json({
      success: true,
      claimed: true,
      data: claimedTable.toPublicJSON(),
    });
  } catch (error) {
    if (error.name === 'CastError' || error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Table ID format. Please scan a valid café table QR code.',
      });
    }
    next(error);
  }
};

/**
 * @desc    Renew the caller's claim on a table (keeps the table occupied)
 * @route   POST /api/tables/:id/heartbeat
 * @access  Public
 */
const heartbeatTable = async (req, res, next) => {
  try {
    const customerSessionId = normalizeSessionId(req.body?.customerSessionId);
    if (!customerSessionId) {
      return res.status(400).json({
        success: false,
        message: 'customerSessionId is required.',
      });
    }

    const now = new Date();
    const renewedTable = await Table.findOneAndUpdate(
      { _id: req.params.id, occupiedBy: customerSessionId },
      { $set: { occupancyExpiresAt: new Date(now.getTime() + getOccupancyTtlMs()) } },
      { new: true },
    );

    if (renewedTable) {
      if (!renewedTable.active) {
        return res.status(400).json({
          success: false,
          message: `Table #${renewedTable.tableNumber} is currently inactive or out of service.`,
          data: renewedTable.toPublicJSON(),
        });
      }
      return res.json({
        success: true,
        data: renewedTable.toPublicJSON(),
      });
    }

    // The claim was not held by this session — explain why so the client can
    // either re-claim (claim lost) or show the waiting screen (occupied).
    const table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found. Please scan a valid café table QR code.',
      });
    }

    if (!table.active) {
      return res.status(400).json({
        success: false,
        message: `Table #${table.tableNumber} is currently inactive or out of service.`,
        data: table.toPublicJSON(),
      });
    }

    if (table.isOccupiedNow()) {
      return res.status(409).json({
        success: false,
        code: ERROR_CODES.TABLE_OCCUPIED,
        message: `Table #${table.tableNumber} is currently in use by another guest. Please wait for them to finish, or scan the QR code at another free table.`,
        data: table.toPublicJSON(),
      });
    }

    return res.status(409).json({
      success: false,
      code: ERROR_CODES.TABLE_CLAIM_LOST,
      message: `Your hold on Table #${table.tableNumber} expired. Please claim the table again.`,
      data: table.toPublicJSON(),
    });
  } catch (error) {
    if (error.name === 'CastError' || error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Table ID format. Please scan a valid café table QR code.',
      });
    }
    next(error);
  }
};

/**
 * @desc    Release a table held by the caller's session (safe to call twice)
 * @route   POST /api/tables/:id/release
 * @access  Public
 */
const releaseTable = async (req, res, next) => {
  try {
    const customerSessionId = normalizeSessionId(req.body?.customerSessionId);
    if (!customerSessionId) {
      return res.status(400).json({
        success: false,
        message: 'customerSessionId is required.',
      });
    }

    // Session-scoped so a stray release can never free a table that another
    // guest has since claimed.
    const table = await Table.findOneAndUpdate(
      { _id: req.params.id, occupiedBy: customerSessionId },
      { $set: clearOccupancyFields },
      { new: true },
    );

    if (!table) {
      const exists = await Table.findById(req.params.id).select('_id');
      if (!exists) {
        return res.status(404).json({
          success: false,
          message: 'Table not found.',
        });
      }
      return res.json({
        success: true,
        released: false,
        message: 'Table was not held by this session.',
      });
    }

    return res.json({
      success: true,
      released: true,
      data: table.toPublicJSON(),
    });
  } catch (error) {
    if (error.name === 'CastError' || error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Table ID format.',
      });
    }
    next(error);
  }
};

/**
 * @desc    Force-free a table's occupancy (staff override)
 * @route   DELETE /api/tables/:id/occupancy
 * @access  Protected (Admin)
 */
const clearTableOccupancy = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ success: false, code: ERROR_CODES.TABLE_NOT_FOUND, message: 'Table not found' });
    }

    if (!table.isOccupiedNow()) {
      return res.json({
        success: true,
        released: false,
        message: `Table #${table.tableNumber} is already free.`,
        data: table.toPublicJSON(),
      });
    }

    Object.assign(table, clearOccupancyFields);
    await table.save();

    return res.json({
      success: true,
      released: true,
      message: `Table #${table.tableNumber} is now free.`,
      data: table.toPublicJSON(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTables,
  getAssignableWaiters,
  assignTableWaiter,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  getTableQR,
  claimTable,
  heartbeatTable,
  releaseTable,
  clearTableOccupancy,
};
