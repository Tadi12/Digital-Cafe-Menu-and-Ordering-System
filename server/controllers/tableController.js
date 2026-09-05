const Table = require('../models/Table');
const { generateTableQRCode } = require('../services/qrService');

/**
 * @desc    Get all café tables
 * @route   GET /api/tables
 * @access  Public / Protected
 */
const getTables = async (req, res, next) => {
  try {
    const tables = await Table.find({}).sort({ tableNumber: 1 });
    return res.json({
      success: true,
      count: tables.length,
      data: tables,
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
        data: table,
      });
    }

    return res.json({
      success: true,
      data: table,
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
      return res.status(404).json({ success: false, message: 'Table not found' });
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
      return res.status(404).json({ success: false, message: 'Table not found' });
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
      return res.status(404).json({ success: false, message: 'Table not found' });
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

module.exports = {
  getTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  getTableQR,
};
