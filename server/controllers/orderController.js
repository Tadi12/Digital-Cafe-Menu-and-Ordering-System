const Order = require('../models/Order');
const axios = require('axios');
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
    const { customerName, customerSessionId, tableId, items, paymentMethod, paymentReference, receiptData } = req.body;

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

    const isVerifiedPaid = paymentMethod !== 'Cash' && paymentReference && receiptData;

    const order = await Order.create({
      orderNumber,
      customerName: customerName.trim(),
      customerSessionId: normalizedSessionId,
      table: table._id,
      tableNumberSnapshot: table.tableNumber,
      items: orderItemsSnapshot,
      totalAmount,
      paymentMethod: paymentMethod || 'Cash',
      paymentStatus: isVerifiedPaid ? 'Paid' : 'Unpaid',
      paymentReference: paymentReference || null,
      receiptData: receiptData || null,
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
      
      // Role-Based Status Enforcement
      const role = req.user.role || 'super_admin';
      
      if (role === 'chef' && !['Preparing', 'Ready'].includes(status)) {
        return res.status(403).json({ success: false, message: 'Access Denied: Chefs can only change status to Preparing or Ready.' });
      }
      
      if (role === 'waiter' && status !== 'Completed') {
        return res.status(403).json({ success: false, message: 'Access Denied: Waiters can only change status to Completed.' });
      }

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
    const populatedUpdatedOrder = await Order.findById(updatedOrder._id)
      .populate('table', 'tableNumber tableName');

    // Real-time Socket.IO broadcast to both customer order room and admin room
    try {
      const io = getIO();
      io.to(`order_${updatedOrder._id}`).emit('order_status_updated', populatedUpdatedOrder);
      io.to('admin_room').emit('order_updated', populatedUpdatedOrder);
    } catch (socketErr) {
      console.warn('[Socket Warning]: Could not emit status update:', socketErr.message);
    }

    return res.json({
      success: true,
      message: `Order status updated to ${updatedOrder.status}`,
      data: populatedUpdatedOrder,
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
    const populatedCancelledOrder = await Order.findById(cancelledOrder._id)
      .populate('table', 'tableNumber tableName');

    // Broadcast cancellation via Socket.IO
    try {
      const io = getIO();
      io.to(`order_${cancelledOrder._id}`).emit('order_status_updated', populatedCancelledOrder);
      io.to('admin_room').emit('order_cancelled', populatedCancelledOrder);
    } catch (socketErr) {
      console.warn('[Socket Warning]: Could not emit cancellation:', socketErr.message);
    }

    return res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: populatedCancelledOrder,
    });
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bank, reference } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    
    if (order.paymentStatus === 'Paid') {
      return res.status(400).json({ success: false, message: 'Order is already paid.' });
    }

    const pythonService = process.env.RECEIPT_VERIFIER_URL;
    const cafeAccount = process.env.CAFE_BANK_ACCOUNT;

    if (!pythonService || !cafeAccount) {
      return res.status(500).json({ success: false, message: 'Server is missing payment verification configuration (.env)' });
    }

    let receiptData = null;

    try {
      const accountTail = cafeAccount.slice(-8); // CBE requires last 8 digits
      const response = await axios.get(`${pythonService}/verify?bank=${encodeURIComponent(bank.trim())}&reference=${encodeURIComponent(reference.trim())}&account_tail=${encodeURIComponent(accountTail)}`);
      
      if (!response.data.success) {
        return res.status(400).json({ success: false, message: 'Invalid receipt: ' + response.data.error });
      }
      receiptData = response.data.data;
      
    } catch (err) {
      console.error("[Python Service Error]:", err.message);
      return res.status(503).json({ 
        success: false, 
        message: 'Bank verification service is currently unavailable or the reference is invalid.' 
      });
    }

    // Normalize fields due to different bank extraction keys
    console.log('RECEIPT DATA:', receiptData);
    
    const extractedReceiver = receiptData.receiver_account || receiptData.to_account || receiptData.receiver || null;
    const rawAmount = receiptData.amount || receiptData.transferred_amount || receiptData.total_amount || '0';
    const extractedAmount = parseFloat(String(rawAmount).replace(/[^0-9.]/g, ''));

    // 1. Check receiver account
    if (bank.toLowerCase() !== 'cbe') {
      if (!extractedReceiver) {
        return res.status(400).json({ success: false, message: 'Unable to read receiver account from receipt data.' });
      }
      
      const cleanReceiver = extractedReceiver.replace(/\*/g, '');
      if (!cafeAccount.includes(cleanReceiver) && !cleanReceiver.includes(cafeAccount.slice(-4))) {
        return res.status(400).json({ success: false, message: 'Receipt receiver account does not match cafe account!' });
      }
    }

    // 2. Check Amount
    if (extractedAmount < order.totalAmount) {
      return res.status(400).json({ success: false, message: `Paid amount (${extractedAmount} ETB) is less than order total (${order.totalAmount} ETB)!` });
    }

    // 3. Check Status and Currency
    const status = (receiptData.status || '').toUpperCase();
    if (status && status !== "SUCCESS" && status !== "COMPLETED") {
      return res.status(400).json({ success: false, message: 'Receipt status is not SUCCESS!' });
    }
    
    const currency = (receiptData.currency || 'ETB').toUpperCase();
    if (currency !== "ETB") {
      return res.status(400).json({ success: false, message: 'Currency must be ETB!' });
    }

    // 4. Check Freshness (within 30 minutes)
    const receiptDateStr = receiptData.date || receiptData.payment_date || receiptData.transaction_date;
    if (receiptDateStr) {
      const receiptDate = new Date(receiptDateStr);
      const timeDiffMins = (Date.now() - receiptDate.getTime()) / (1000 * 60);
      
      // TEMP DISABLED FOR TESTING:
      // if (timeDiffMins > 30) {
      //   return res.status(400).json({ success: false, message: 'Receipt is too old (older than 30 minutes). Please provide a recent receipt.' });
      // }
    }

    // 5. Success! Mark order as paid
    order.paymentStatus = 'Paid';
    order.paymentReference = reference;
    order.receiptData = receiptData;
    await order.save();

    // Re-fetch populated order to send to clients
    const populatedOrder = await Order.findById(order._id).populate('table', 'tableNumber tableName');

    // Notify Admin
    try {
      const io = require('../sockets/socketHandler').getIO();
      io.to('admin_room').emit('order_status_updated', populatedOrder);
    } catch (socketErr) {
      console.warn('[Socket Warning]: Could not emit order_status_updated event:', socketErr.message);
    }

    return res.json({ success: true, message: 'Payment verified successfully!', data: populatedOrder });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This receipt reference has already been used for another order!' });
    }
    next(error);
  }
};

const verifyReceiptOnly = async (req, res, next) => {
  try {
    const { bank, reference, expectedAmount } = req.body;
    if (!bank || !reference || !expectedAmount) {
      return res.status(400).json({ success: false, message: 'Bank, reference, and expectedAmount are required' });
    }

    const pythonService = process.env.RECEIPT_VERIFIER_URL;
    const cafeAccount = process.env.CAFE_BANK_ACCOUNT;

    if (!pythonService || !cafeAccount) {
      return res.status(500).json({ success: false, message: 'Server is missing payment verification configuration (.env)' });
    }

    let receiptData = null;

    try {
      const accountTail = cafeAccount.slice(-8); // CBE requires last 8 digits
      const response = await axios.get(`${pythonService}/verify?bank=${encodeURIComponent(bank.trim())}&reference=${encodeURIComponent(reference.trim())}&account_tail=${encodeURIComponent(accountTail)}`);
      
      if (!response.data.success) {
        return res.status(400).json({ success: false, message: 'Invalid receipt: ' + response.data.error });
      }
      receiptData = response.data.data;
      
    } catch (err) {
      console.error("[Python Service Error]:", err.message);
      return res.status(503).json({ 
        success: false, 
        message: 'Bank verification service is currently unavailable or the reference is invalid.' 
      });
    }

    // Normalize fields due to different bank extraction keys
    const extractedReceiver = receiptData.receiver_account || receiptData.to_account || receiptData.receiver || null;
    const rawAmount = receiptData.amount || receiptData.transferred_amount || receiptData.total_amount || '0';
    const extractedAmount = parseFloat(String(rawAmount).replace(/[^0-9.]/g, ''));

    // 1. Check receiver account
    if (bank.toLowerCase() !== 'cbe') {
      if (!extractedReceiver) {
        return res.status(400).json({ success: false, message: 'Unable to read receiver account from receipt data.' });
      }
      
      const cleanReceiver = extractedReceiver.replace(/\*/g, '');
      if (!cafeAccount.includes(cleanReceiver) && !cleanReceiver.includes(cafeAccount.slice(-4))) {
        return res.status(400).json({ success: false, message: 'Receipt receiver account does not match cafe account!' });
      }
    }

    // 2. Check Amount
    if (extractedAmount < parseFloat(expectedAmount)) {
      return res.status(400).json({ success: false, message: `Paid amount (${extractedAmount} ETB) is less than order total (${expectedAmount} ETB)!` });
    }

    // 3. Check Status and Currency
    const status = (receiptData.status || '').toUpperCase();
    if (status && status !== "SUCCESS" && status !== "COMPLETED") {
      return res.status(400).json({ success: false, message: 'Receipt status is not SUCCESS!' });
    }
    
    const currency = (receiptData.currency || 'ETB').toUpperCase();
    if (currency !== "ETB") {
      return res.status(400).json({ success: false, message: 'Currency must be ETB!' });
    }

    // 4. Check Freshness
    const receiptDateStr = receiptData.date || receiptData.payment_date || receiptData.transaction_date;
    if (receiptDateStr) {
      const receiptDate = new Date(receiptDateStr);
      const timeDiffMins = (Date.now() - receiptDate.getTime()) / (1000 * 60);
      // TEMP DISABLED FOR TESTING
      // if (timeDiffMins > 30) {
      //   return res.status(400).json({ success: false, message: 'Receipt is too old (older than 30 minutes). Please provide a recent receipt.' });
      // }
    }

    // 5. Check Replay Attack
    const existingOrder = await Order.findOne({ paymentReference: reference });
    if (existingOrder) {
      return res.status(400).json({ success: false, message: 'This receipt reference has already been used for another order!' });
    }

    return res.json({ success: true, message: 'Payment verified successfully!', data: receiptData });
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
  verifyPayment,
  verifyReceiptOnly,
};
