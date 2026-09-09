const Order = require('../models/Order');
const Table = require('../models/Table');
const Food = require('../models/Food');
const { getIO } = require('../sockets/socketHandler');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Helper to generate readable Order Number (e.g. ORD-7824)
const generateOrderNumber = () => {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${randomDigits}`;
};

/**
 * @desc    Place a new café order (Customer)
 * @route   POST /api/orders
 * @access  Public
 */
const createOrder = async (req, res, next) => {
  try {
    const { customerName, customerSessionId, tableId, items } = req.body;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required',
      });
    }

    const normalizedSessionId = typeof customerSessionId === 'string' ? customerSessionId.trim() : '';

    if (!tableId) {
      return res.status(400).json({
        success: false,
        message: 'Table identification is required',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one food item',
      });
    }

    // Validate Table existence & active status
    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found. Please scan a valid café table QR code.',
      });
    }

    if (!table.active) {
      return res.status(400).json({
        success: false,
        message: `Table #${table.tableNumber} is currently inactive.`,
      });
    }

    // Process order items & preserve food snapshots
    let totalAmount = 0;
    const orderItemsSnapshot = [];

    for (const item of items) {
      if (!item.foodId || !item.quantity || Number(item.quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid item quantity or missing food ID',
        });
      }

      const food = await Food.findById(item.foodId);
      if (!food) {
        return res.status(404).json({
          success: false,
          message: `Food item with ID ${item.foodId} not found`,
        });
      }

      // Check food availability constraint
      if (!food.available) {
        return res.status(400).json({
          success: false,
          message: `Sorry, "${food.name.en}" (${food.name.am}) is currently unavailable`,
        });
      }

      const itemTotal = food.price * Number(item.quantity);
      totalAmount += itemTotal;

      orderItemsSnapshot.push({
        food: food._id,
        foodName: {
          en: food.name.en,
          am: food.name.am,
        },
        price: food.price,
        quantity: Number(item.quantity),
      });
    }

    let orderNumber = generateOrderNumber();
    let isUnique = false;
    while (!isUnique) {
      const existing = await Order.findOne({ orderNumber });
      if (!existing) {
        isUnique = true;
      } else {
        orderNumber = generateOrderNumber();
      }
    }

    const order = await Order.create({
      orderNumber,
      customerName: customerName.trim(),
      customerSessionId: normalizedSessionId,
      table: table._id,
      tableNumberSnapshot: table.tableNumber,
      items: orderItemsSnapshot,
      totalAmount,
      paymentMethod: 'Cash',
      paymentStatus: 'Unpaid',
      status: 'Pending',
    });

    const populatedOrder = await Order.findById(order._id).populate('table', 'tableNumber tableName');

    // Emit Real-time Socket.IO event to Admin room
    try {
      const io = getIO();
      io.to('admin_room').emit('new_order', populatedOrder);
    } catch (socketErr) {
      console.warn('[Socket Warning]: Could not emit new_order event:', socketErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Order submitted successfully',
      data: populatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all orders with optional status filter & search (Admin)
 * @route   GET /api/orders
 * @access  Protected (Admin)
 */
const getOrders = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status && ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'].includes(status)) {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { orderNumber: searchRegex },
        { customerName: searchRegex },
      ];
    }

    const orders = await Order.find(query)
      .populate('table', 'tableNumber tableName')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all orders for a specific customer (Public for order tracking history)
 * @route   GET /api/orders/customer/:customerName
 * @access  Public
 */
const getCustomerOrders = async (req, res, next) => {
  try {
    const customerName = req.params.customerName || req.query.customerName;
    const customerSessionId = req.query.customerSessionId || '';
    const normalizedName = String(customerName || '').trim();
    const normalizedSessionId = String(customerSessionId || '').trim();

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required to fetch their order history.',
      });
    }

    const query = {
      customerName: new RegExp(`^${escapeRegex(normalizedName)}$`, 'i'),
    };

    if (normalizedSessionId) {
      query.customerSessionId = new RegExp(`^${escapeRegex(normalizedSessionId)}$`, 'i');
    }

    const orders = await Order.find(query)
      .populate('table', 'tableNumber tableName')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get order details by ID (Customer / Admin tracking)
 * @route   GET /api/orders/:id
 * @access  Public
 */
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('table', 'tableNumber tableName');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }
    next(error);
  }
};

/**
 * @desc    Update order status (Admin)
 * @route   PATCH /api/orders/:id/status
 * @access  Protected (Admin)
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, paymentStatus } = req.body;
    const order = await Order.findById(req.params.id).populate('table', 'tableNumber tableName');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const allowedStatuses = ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`,
      });
    }

    // Business Rule: Validate valid status transition flow (Pending -> Preparing -> Ready -> Completed)
    if (status && status !== order.status) {
      const validTransitions = {
        Pending: ['Preparing', 'Cancelled'],
        Preparing: ['Ready', 'Cancelled'],
        Ready: ['Completed'],
        Completed: [],
        Cancelled: [],
      };

      if (!validTransitions[order.status].includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid transition from ${order.status} to ${status}. Transition flow must be Pending → Preparing → Ready → Completed.`,
        });
      }

      order.status = status;
    }

    if (paymentStatus && ['Unpaid', 'Paid'].includes(paymentStatus)) {
      order.paymentStatus = paymentStatus;
    }

    const updatedOrder = await order.save();

    // Real-time Socket.IO broadcast to both customer order room and admin room
    try {
      const io = getIO();
      io.to(`order_${updatedOrder._id}`).emit('order_status_updated', updatedOrder);
      io.to('admin_room').emit('order_updated', updatedOrder);
    } catch (socketErr) {
      console.warn('[Socket Warning]: Could not emit status update:', socketErr.message);
    }

    return res.json({
      success: true,
      message: `Order status updated to ${updatedOrder.status}`,
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel order (Customer - Allowed ONLY while Pending)
 * @route   PATCH /api/orders/:id/cancel
 * @access  Public
 */
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('table', 'tableNumber tableName');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Business Rule: Customers can cancel an order ONLY when the order status is Pending
    if (order.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order. Orders can only be cancelled while status is Pending. Current status is ${order.status}.`,
      });
    }

    order.status = 'Cancelled';
    const cancelledOrder = await order.save();

    // Broadcast cancellation via Socket.IO
    try {
      const io = getIO();
      io.to(`order_${cancelledOrder._id}`).emit('order_status_updated', cancelledOrder);
      io.to('admin_room').emit('order_cancelled', cancelledOrder);
    } catch (socketErr) {
      console.warn('[Socket Warning]: Could not emit cancellation:', socketErr.message);
    }

    return res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: cancelledOrder,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getCustomerOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
};
