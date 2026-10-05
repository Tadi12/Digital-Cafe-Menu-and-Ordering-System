let ioInstance = null;
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const AdminSession = require('../models/AdminSession');
const Order = require('../models/Order');
const { itemsForTrack, groupItemsByTrack, toStatusPayload, ROLE_TRACK, trackStatusField } = require('../utils/orderStatus');
const { isStaffEnabled } = require('../utils/staffAccess');

/** How many times one connection may ring the floor before the rest are dropped. */
const MAX_CALLS_PER_SOCKET = 5;

/**
 * Narrows a shared order to the items one preparation station owns.
 *
 * The chef and the barista read the SAME order document; this only trims the item
 * list on the way out so a barista is never handed the kitchen's tickets. The
 * order number, totals and status are passed through untouched, so this cannot
 * create or duplicate a customer order.
 */
const scopeForStation = (order, track) => ({
  ...order.toObject(),
  items: itemsForTrack(order.items, track),
  station: track,
  stationStatus: order[trackStatusField(track)],
});

/**
 * Shape an order for a socket push.
 *
 * Both preparation tracks and the derived overall status travel with EVERY event,
 * so a waiter watching a combined order sees the chef's and the barista's progress
 * update together and never has to guess whether it received a partial payload.
 */
const toSocketPayload = (order) => ({
  ...order.toObject(),
  ...toStatusPayload(order),
  ...groupItemsByTrack(order.items || []),
});

/** Room name for one waiter's private order feed. */
const waiterRoom = (waiterId) => `waiter_${waiterId}`;

/**
 * Roles allowed to join the whole-cafe admin feed.
 *
 * Mirrors the client's own branch in OrderManagerPage: a chef or barista takes
 * the station room, a waiter takes their private room, and only management falls
 * through to joinAdminRoom. admin_room carries every order in the cafe including
 * customer names and totals, so it is not a room a customer should reach by
 * simply emitting an event name.
 */
const ADMIN_ROOM_ROLES = ['super_admin', 'admin'];

/**
 * Resolve a staff member from a JWT, or null if it is not a live session.
 *
 * Shared by every privileged socket handler so authentication is decided in one
 * place. The role comes from the database document, never from the payload, and
 * the session must still be active and unexpired — so a revoked device loses its
 * rooms immediately rather than at token expiry.
 *
 * @param {string} token
 * @returns {Promise<object|null>} the Admin document, or null
 */
const resolveStaffFromToken = async (token) => {
  if (!token || typeof token !== 'string') return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.sessionId || !decoded.id) return null;

    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin) return null;

    // A disabled account gets no rooms. Without this a signed-out staff member
    // would keep receiving the live order feed on an already-open socket until
    // it happened to reconnect — the socket outlives the HTTP session.
    if (!isStaffEnabled(admin)) return null;

    const session = await AdminSession.exists({
      _id: decoded.sessionId,
      admin: admin._id,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });
    if (!session) return null;

    return admin;
  } catch (error) {
    // An invalid or expired token must never be treated as authorised.
    return null;
  }
};

/**
 * Push an order to the waiter currently responsible for its table.
 *
 * Ownership is resolved HERE, at emit time, by walking Order -> Table ->
 * assignedWaiter. That is what makes reassignment behave correctly with no extra
 * work: a table that moves from Abebe to Hana instantly stops feeding Abebe's
 * room and starts feeding Hana's, and the orders themselves are never rewritten.
 *
 * Silently does nothing for an unassigned table — there is nobody to notify.
 *
 * @param {object} order a populated (or plain) order carrying `table`
 */
const emitToOrderWaiter = async (order) => {
  try {
    const io = getIO();

    // Only the ref is usable here: `tableNumberSnapshot` is a number, not an id.
    // Accepts both a populated table document and a bare ObjectId.
    const tableRef = order?.table;
    if (!tableRef) return;

    const Table = require('../models/Table');
    const tableId = tableRef._id || tableRef;
    const table = await Table.findById(tableId).select('assignedWaiter');
    const assignedWaiter = table?.assignedWaiter;
    if (!assignedWaiter) return;

    io.to(waiterRoom(assignedWaiter)).emit('order_updated', toSocketPayload(order));
  } catch (error) {
    // A realtime nicety must never break the request that triggered it.
    console.warn('[Socket Warning]: Could not notify order waiter:', error.message);
  }
};

const initSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[Socket Connected]: ${socket.id}`);

    // Admin joins the admin room for all real-time order alerts.
    //
    // This room receives every order in the cafe, so it must be earned: the token
    // is verified, the session must still be live, and the role must be
    // management. It previously accepted a bare `join_admin_room` with no
    // argument, which let any browser on the public menu — or anyone who found the
    // websocket URL — subscribe to the full order feed.
    socket.on('join_admin_room', async (token) => {
      const admin = await resolveStaffFromToken(token);
      if (!admin || !ADMIN_ROOM_ROLES.includes(admin.role)) return;

      socket.join('admin_room');
      console.log(`[Socket]: ${socket.id} joined admin_room as ${admin.role}`);
    });

    // A chef or a barista joins the room for the half of the order they prepare.
    // The role is taken from the token, never from the payload, so a client cannot
    // ask to join the other station's room.
    socket.on('join_station_room', async (token) => {
      const admin = await resolveStaffFromToken(token);
      if (!admin) return;

      const track = ROLE_TRACK[admin.role];
      if (!track) return;

      socket.join(`${track}_room`);
      console.log(`[Socket]: ${socket.id} joined ${track}_room as ${admin.role}`);
    });

    // A device-specific room lets the API immediately notify a browser when
    // its server-side admin session has been revoked.
    socket.on('register_admin_session', async (token) => {
      const admin = await resolveStaffFromToken(token);
      if (!admin) return;

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      for (const room of socket.rooms) {
        if (room.startsWith('admin_session_')) socket.leave(room);
      }
      socket.join(`admin_session_${decoded.sessionId}`);
    });

    // A waiter subscribes to a room named after THEM, not after their tables. When
    // an admin reassigns a table, membership is irrelevant because the server
    // resolves the order's current owner at emit time — so the old waiter stops
    // receiving updates and the new one starts, with no socket bookkeeping.
    socket.on('join_waiter_room', async (token) => {
      const admin = await resolveStaffFromToken(token);
      if (!admin) return;

      // Only a real waiter gets a waiter room; an admin uses admin_room.
      if (admin.role !== 'waiter') return;

      socket.join(waiterRoom(admin._id.toString()));
      console.log(`[Socket]: ${socket.id} joined ${waiterRoom(admin._id)} as waiter`);
    });

    // Customer joins a room specific to their order ID for live tracking.
    //
    // The room is named after a real order, so joining it must be proved the same
    // way reading the order is: by presenting the customerSessionId that was
    // generated when the order was placed. Previously any orderId was accepted, so
    // a client could subscribe to another customer's live feed by guessing ids.
    socket.on('join_order_room', async (orderId, customerSessionId) => {
      if (!mongoose.Types.ObjectId.isValid(orderId)) return;

      try {
        const order = await Order.findById(orderId)
          .select('customerSessionId customerName')
          .lean();
        if (!order) return;

        // Orders placed while the session id was recorded: the caller must present
        // the exact value stored on the order.
        if (order.customerSessionId) {
          const presented = String(customerSessionId || '').trim();
          if (!presented || presented !== order.customerSessionId) return;
        } else {
          // Legacy orders predate the stored session id. Fall back to matching the
          // customer name, which is the same proof /api/orders/customer/:name
          // already accepts — no weaker than the existing read path.
          const presentedName = String(customerSessionId || '').trim().toLowerCase();
          if (!presentedName || presentedName !== String(order.customerName || '').trim().toLowerCase()) return;
        }

        socket.join(`order_${orderId}`);
        console.log(`[Socket]: ${socket.id} joined order_${orderId}`);
      } catch (error) {
        // A realtime nicety must never break the socket.
      }
    });

    // A customer pings the floor from their order screen.
    //
    // The payload used to be forwarded verbatim into every admin dashboard, so a
    // customer could type arbitrary text into the staff notification bar and ring
    // the floor sound at will. Only the table is trusted now, the free-text
    // message is dropped, and each socket is limited to a handful of calls.
    socket.on('call_waiter', async (data) => {
      const calls = (socket.data.waiterCalls = (socket.data.waiterCalls || 0) + 1);
      if (calls > MAX_CALLS_PER_SOCKET) return;

      const tableNumber = Number(data?.tableNumber);
      if (!Number.isFinite(tableNumber) || tableNumber <= 0) return;

      try {
        // The message is generated here rather than accepted from the client, so
        // nothing a customer types can reach a staff screen.
        io.to('admin_room').emit('waiter_called', {
          tableNumber,
          message: `Table ${tableNumber} is requesting assistance`,
        });
      } catch (error) {
        // A realtime nicety must never break the socket.
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected]: ${socket.id}`);
    });
  });
};

// Helper getter to emit socket events from Express controllers
const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.IO not initialized');
  }
  return ioInstance;
};

module.exports = { initSocket, getIO, scopeForStation, toSocketPayload, waiterRoom, emitToOrderWaiter };
