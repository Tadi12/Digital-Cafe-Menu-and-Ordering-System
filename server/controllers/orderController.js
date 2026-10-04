const { ERROR_CODES } = require('../utils/errorCodes');
const Order = require('../models/Order');
const Table = require('../models/Table');
const Food = require('../models/Food');
const { getIO, scopeForStation, emitToOrderWaiter } = require('../sockets/socketHandler');
const {
  initialTrackStatuses,
  deriveOverallStatus,
  syncTracksToOverall,
  mayUpdateTrack,
  isValidTrackTransition,
  itemsForTrack,
  ROLE_TRACK,
  trackStatusField,
  ACTIONABLE_TRACK_STATUSES,
} = require('../utils/orderStatus');
const {
  getAssignedTableIds,
  tableOwnershipFilter,
  isTableOwnedByUser,
  forbiddenOwnership,
  ACTIVE_ORDER_STATUSES,
} = require('../utils/tableAssignment');

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
    const { customerName, customerSessionId, tableId, items, paymentMethod } = req.body;

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

      // The category is populated in the same query as the food, so resolving the
      // food/drink split costs no extra round trip per item.
      const food = await Food.findById(item.foodId).populate('category', 'type');
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

      // Food and drinks share one collection, so the owning category is what
      // decides the station. Categories created before `type` existed report no
      // type at all, and the schema default treats those as food.
      const itemType = food.category?.type === 'drink' ? 'drink' : 'food';

      orderItemsSnapshot.push({
        food: food._id,
        foodName: {
          en: food.name.en,
          am: food.name.am,
        },
        price: food.price,
        quantity: Number(item.quantity),
        itemType,
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

    // No payment verifier exists anymore, so every order starts as Unpaid (cash is settled at the table).

    // The chef and the barista get their own track seeded from what was actually
    // ordered. An order with no drinks leaves drinkStatus 'not_required' so the
    // overall status can still reach Ready without a barista.
    const trackStatuses = initialTrackStatuses(orderItemsSnapshot);

    const order = await Order.create({
      orderNumber,
      customerName: customerName.trim(),
      customerSessionId: normalizedSessionId,
      table: table._id,
      tableNumberSnapshot: table.tableNumber,
      items: orderItemsSnapshot,
      totalAmount,
      paymentMethod: paymentMethod || 'Cash',
      paymentStatus: 'Unpaid',
      foodStatus: trackStatuses.foodStatus,
      drinkStatus: trackStatuses.drinkStatus,
      status: deriveOverallStatus(trackStatuses),
    });

    const populatedOrder = await Order.findById(order._id).populate('table', 'tableNumber tableName');

    // Real-time Socket.IO event to Admin room
    try {
      const io = getIO();
      io.to('admin_room').emit('new_order', populatedOrder);

      // One new customer order, fanned out to the stations that have work on it.
      // A burger + coffee order reaches the chef with the burger and the barista
      // with the coffee, both pointing at the SAME order id — and a station with
      // no items in this order is not sent anything at all.
      for (const track of ['food', 'drink']) {
        if (itemsForTrack(populatedOrder.items, track).length === 0) continue;
        io.to(`${track}_room`).emit('new_order', scopeForStation(populatedOrder, track));
      }

      // The waiter responsible for this table is told about the order too, so the
      // delivery queue fills without a refresh. Resolved through the table.
      emitToOrderWaiter(populatedOrder);
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

    // A chef only has work on orders that contain food, and a barista only on
    // orders that contain drinks. Filtering in the query (rather than hiding rows
    // in the UI) keeps the counts on the filter tabs honest. 'not_required' is the
    // marker the schema uses for "this order has none of these".
    const stationTrack = ROLE_TRACK[req.user?.role];
    if (stationTrack) {
      query[trackStatusField(stationTrack)] = { $ne: 'not_required' };
    }

    // Table ownership. A waiter only ever receives orders sitting on tables
    // assigned to them; the chef, the barista and the admin are unaffected because
    // they own no tables. This runs in the query, so another waiter's orders are
    // never sent to the client in the first place — hiding them in the UI instead
    // would still leak them over the network.
    const assignedTableIds = await getAssignedTableIds(req.user);
    if (assignedTableIds !== null) {
      Object.assign(query, tableOwnershipFilter(req.user, assignedTableIds));
    }

    const orders = await Order.find(query)
      .populate('table', 'tableNumber tableName assignedWaiter')
      .sort({ createdAt: -1 });

    // Same order document for everyone — only the item list is narrowed to the
    // caller's station. totalAmount, the order number and the payment fields are
    // untouched, so this can never double-count revenue or duplicate an order.
    const scoped = stationTrack
      ? orders.map((order) => {
          const trackItems = itemsForTrack(order.items, stationTrack);
          return {
            ...order.toObject(),
            items: trackItems,
            station: stationTrack,
            stationStatus: order[trackStatusField(stationTrack)],
          };
        })
      : orders;

    return res.json({
      success: true,
      count: scoped.length,
      data: scoped,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get the tables assigned to the logged-in waiter, with live order counts
 * @route   GET /api/orders/waiter/tables
 * @access  Protected (waiter / admin)
 *
 * The "My Tables" panel. Admins and super admins are passed through to the full
 * table list so the same screen can back the admin overview.
 */
const getWaiterTables = async (req, res, next) => {
  try {
    const Table = require('../models/Table');

    // Oversight roles are not restricted; `null` from getAssignedTableIds is the
    // documented "unrestricted" signal, and it must not be read as "no tables".
    const assignedTableIds = await getAssignedTableIds(req.user);
    const query =
      assignedTableIds === null ? {} : { _id: { $in: assignedTableIds } };

    const tables = await Table.find(query).populate('assignedWaiter', 'name role');

    // One aggregation for every table's counts instead of a query per card.
    const counts = await Order.aggregate([
      { $match: { table: { $in: tables.map((table) => table._id) } } },
      {
        $group: {
          _id: '$table',
          // An order still needs the waiter: placed, cooking, or plated and waiting.
          activeCount: {
            $sum: { $cond: [{ $in: ['$status', ACTIVE_ORDER_STATUSES] }, 1, 0] },
          },
          totalCount: { $sum: 1 },
        },
      },
    ]);

    const countByTable = new Map(
      counts.map((entry) => [String(entry._id), entry]),
    );

    const data = tables
      .map((table) => {
        const entry = countByTable.get(String(table._id));
        return table.toStaffJSON({
          activeOrderCount: entry?.activeCount || 0,
          totalOrderCount: entry?.totalCount || 0,
        });
      })
      .sort((a, b) => a.tableNumber - b.tableNumber);

    return res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get the orders on ONE table, only if the caller owns that table
 * @route   GET /api/orders/waiter/tables/:tableId/orders
 * @access  Protected (waiter / admin)
 *
 * Ownership is re-verified here from the table document on every request, so
 * editing the URL, swapping the tableId or calling the API directly with another
 * waiter's table all end in the same 403.
 */
const getTableOrders = async (req, res, next) => {
  try {
    const Table = require('../models/Table');
    const table = await Table.findById(req.params.tableId);

    if (!table) {
      return res.status(404).json({
        success: false,
        code: ERROR_CODES.TABLE_NOT_FOUND,
        message: 'Table not found',
      });
    }

    // The authorization boundary for this whole endpoint.
    if (!isTableOwnedByUser(req.user, table)) {
      const { status, body } = forbiddenOwnership();
      return res.status(status).json(body);
    }

    const assignedTableIds = await getAssignedTableIds(req.user);
    const query = { table: table._id };
    if (assignedTableIds !== null) {
      Object.assign(query, tableOwnershipFilter(req.user, assignedTableIds));
    }

    const orders = await Order.find(query)
      .populate('table', 'tableNumber tableName')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: orders.length,
      table: table.toStaffJSON(),
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
      return res.status(404).json({ success: false, code: ERROR_CODES.ORDER_NOT_FOUND, message: 'Order not found' });
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
    // Set when the status transition is applied by the conditional update below.
    let updatedOrder = null;
    let statusChanged = false;
    const order = await Order.findById(req.params.id).populate('table', 'tableNumber tableName');

    if (!order) {
      return res.status(404).json({ success: false, code: ERROR_CODES.ORDER_NOT_FOUND, message: 'Order not found' });
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
          code: ERROR_CODES.INVALID_STATUS_TRANSITION,
        code: ERROR_CODES.INVALID_STATUS_TRANSITION,
        message: `Invalid transition from ${order.status} to ${status}. Transition flow must be Pending → Preparing → Ready → Completed.`,
        });
      }

      // Apply the status change as one conditional write instead of an
      // unconditional save below.
      //
      // The value this request validated against becomes part of the update
      // filter, so if two admins (or one admin whose button was double-tapped)
      // both read "Pending", only the first write matches. The second finds the
      // document already at "Preparing", matches nothing, and is rejected below
      // instead of silently writing the status a second time.
      //
      // The two preparation tracks are raised to match, because this endpoint
      // predates the split and is still how the admin and the waiter move an
      // order. Leaving them behind would let an overall status contradict the
      // food/drink state the kitchen and the barista are working to.
      const syncedTracks = syncTracksToOverall(order, status);

      updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id, status: order.status },
        {
          $set: {
            status,
            foodStatus: syncedTracks.foodStatus,
            drinkStatus: syncedTracks.drinkStatus,
          },
        },
        { new: true },
      );
      
      if (!updatedOrder) {
        return res.status(409).json({
          success: false,
          code: ERROR_CODES.INVALID_STATUS_TRANSITION,
          message:
            'The order status changed while this request was in flight. Refresh and try again.',
        });
      }
      
      statusChanged = true;
    }
    
    if (paymentStatus && ['Unpaid', 'Paid'].includes(paymentStatus)) {
      if (statusChanged) {
        // The status was already applied by the conditional update; patch only
        // the payment field so the status is not written a second time.
        await Order.updateOne({ _id: order._id }, { $set: { paymentStatus } });
        updatedOrder.paymentStatus = paymentStatus;
      } else {
        order.paymentStatus = paymentStatus;
        updatedOrder = await order.save();
      }
    } else if (!statusChanged) {
      updatedOrder = await order.save();
    }

    const populatedUpdatedOrder = await Order.findById(updatedOrder._id)
      .populate('table', 'tableNumber tableName');

    // Real-time Socket.IO broadcast to both customer order room and admin room
    try {
      const io = getIO();
      io.to(`order_${updatedOrder._id}`).emit('order_status_updated', populatedUpdatedOrder);
      io.to('admin_room').emit('order_updated', populatedUpdatedOrder);
      // The waiter responsible for this table follows the order's progress, so a
      // chef/barista status change reaches exactly the waiter who must deliver it.
      emitToOrderWaiter(populatedUpdatedOrder);
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
 * @desc    Update ONE preparation track (foodStatus / drinkStatus)
 * @route   PATCH /api/orders/:id/preparation
 * @access  Protected (chef -> food, barista -> drink, admin -> both)
 *
 * This is the endpoint the chef and the barista use. It is deliberately separate
 * from PATCH /:id/status, which stays the single overall-status endpoint the admin
 * and the waiter already use, so no existing workflow changes.
 *
 * Authorization is enforced here on the server, not in the UI: `mayUpdateTrack`
 * reads the role off the verified token, so a barista posting { track: 'food' }
 * gets a 403 no matter what the client rendered.
 */
const updatePreparationStatus = async (req, res, next) => {
  try {
    const { track, status } = req.body || {};
    const role = req.user?.role;

    if (!['food', 'drink'].includes(track)) {
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.BAD_REQUEST,
        message: 'Track must be either food or drink',
      });
    }

    if (!ACTIONABLE_TRACK_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.BAD_REQUEST,
        message: `Invalid preparation status. Allowed values: ${ACTIONABLE_TRACK_STATUSES.join(', ')}`,
      });
    }

    // Backend-enforced role/track separation. 403 rather than 400: the caller is
    // authenticated but is not allowed to touch this half of the order.
    if (!mayUpdateTrack(role, track)) {
      return res.status(403).json({
        success: false,
        code: ERROR_CODES.AUTH_FORBIDDEN,
        message:
          role === 'chef'
            ? 'Access Denied: Chefs can only update the food preparation status.'
            : role === 'barista'
              ? 'Access Denied: Baristas can only update the drink preparation status.'
              : 'Access Denied: Your role cannot update preparation statuses.',
      });
    }

    const field = trackStatusField(track);
    const order = await Order.findById(req.params.id).populate('table', 'tableNumber tableName');

    if (!order) {
      return res.status(404).json({ success: false, code: ERROR_CODES.ORDER_NOT_FOUND, message: 'Order not found' });
    }

    // A cancelled order is closed for good; neither station may reopen it.
    if (order.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.INVALID_STATUS_TRANSITION,
        message: 'Cannot change the preparation status of a cancelled order.',
      });
    }

    const currentTrackStatus = order[field];

    // Nothing for this station to do on this order (e.g. a drink-only order where
    // the chef calls in). Rejected rather than silently accepted.
    if (currentTrackStatus === 'not_required') {
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.BAD_REQUEST,
        message: `This order has no ${track} items, so there is nothing to prepare.`,
      });
    }

    if (currentTrackStatus === status) {
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.INVALID_STATUS_TRANSITION,
        message: `The ${track} preparation status is already ${status}.`,
      });
    }

    if (!isValidTrackTransition(currentTrackStatus, status)) {
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.INVALID_STATUS_TRANSITION,
        message: `Invalid ${track} transition from ${currentTrackStatus} to ${status}. Each track must move forward one step at a time.`,
      });
    }

    // Derive the overall status from BOTH tracks before writing, so the single
    // status the customer, waiter and analytics read can never disagree with the
    // two preparation tracks.
    const nextTracks = {
      foodStatus: track === 'food' ? status : order.foodStatus,
      drinkStatus: track === 'drink' ? status : order.drinkStatus,
    };
    const overallStatus = deriveOverallStatus(nextTracks);

    // Conditional write: the value validated above is part of the filter, so two
    // simultaneous clicks (or a socket echo landing mid-flight) cannot both apply.
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, [field]: currentTrackStatus },
      { $set: { [field]: status, status: overallStatus } },
      { new: true },
    );

    if (!updatedOrder) {
      return res.status(409).json({
        success: false,
        code: ERROR_CODES.INVALID_STATUS_TRANSITION,
        message:
          'The preparation status changed while this request was in flight. Refresh and try again.',
      });
    }

    const populatedUpdatedOrder = await Order.findById(updatedOrder._id)
      .populate('table', 'tableNumber tableName');

    // Real-time: the customer room and the admin room already receive the whole
    // order. The station room receives it too, but narrowed to its own items, so
    // the barista is never handed the kitchen's tickets (and vice versa).
    try {
      const io = getIO();
      io.to(`order_${updatedOrder._id}`).emit('order_status_updated', populatedUpdatedOrder);
      io.to('admin_room').emit('order_updated', populatedUpdatedOrder);

      if (ROLE_TRACK[role]) {
        io.to(`${ROLE_TRACK[role]}_room`).emit('order_updated', {
          ...populatedUpdatedOrder.toObject(),
          items: itemsForTrack(populatedUpdatedOrder.items, ROLE_TRACK[role]),
          station: ROLE_TRACK[role],
          stationStatus: populatedUpdatedOrder[trackStatusField(ROLE_TRACK[role])],
        });
      }

      // The chef/barista moving a track is exactly the moment the assigned waiter
      // needs to hear about it, so it reaches them too — scoped to their table.
      emitToOrderWaiter(populatedUpdatedOrder);
    } catch (socketErr) {
      console.warn('[Socket Warning]: Could not emit preparation update:', socketErr.message);
    }

    return res.json({
      success: true,
      message: `${track === 'food' ? 'Food' : 'Drink'} preparation status updated to ${status}`,
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
      return res.status(404).json({ success: false, code: ERROR_CODES.ORDER_NOT_FOUND, message: 'Order not found' });
    }

    // Business Rule: Customers can cancel an order ONLY when the order status is Pending
    if (order.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.ORDER_CANCEL_NOT_ALLOWED,
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
      // Tell the responsible waiter their delivery task just disappeared.
      emitToOrderWaiter(populatedCancelledOrder);
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

module.exports = {
  createOrder,
  getOrders,
  getWaiterTables,
  getTableOrders,
  getCustomerOrders,
  getOrderById,
  updateOrderStatus,
  updatePreparationStatus,
  cancelOrder,
};
