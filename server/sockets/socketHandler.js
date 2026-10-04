let ioInstance = null;
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const AdminSession = require('../models/AdminSession');
const { itemsForTrack, ROLE_TRACK, trackStatusField } = require('../utils/orderStatus');

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

const initSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[Socket Connected]: ${socket.id}`);

    // Admin joins the admin room for all real-time order alerts
    socket.on('join_admin_room', () => {
      socket.join('admin_room');
      console.log(`[Socket]: ${socket.id} joined admin_room`);
    });

    // A chef or a barista joins the room for the half of the order they prepare.
    // The role is taken from the token, never from the payload, so a client cannot
    // ask to join the other station's room.
    socket.on('join_station_room', async (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.sessionId) return;

        const admin = await Admin.findById(decoded.id).select('role');
        const session = admin && await AdminSession.exists({
          _id: decoded.sessionId,
          admin: admin._id,
          isActive: true,
          expiresAt: { $gt: new Date() },
        });
        if (!session) return;

        const track = ROLE_TRACK[admin.role];
        if (!track) return;

        socket.join(`${track}_room`);
        console.log(`[Socket]: ${socket.id} joined ${track}_room as ${admin.role}`);
      } catch (error) {
        // An invalid or expired token must never join a station room.
      }
    });

    // A device-specific room lets the API immediately notify a browser when
    // its server-side admin session has been revoked.
    socket.on('register_admin_session', async (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.sessionId) return;

        const session = await AdminSession.exists({
          _id: decoded.sessionId,
          admin: decoded.id,
          isActive: true,
          expiresAt: { $gt: new Date() },
        });
        if (!session) return;

        for (const room of socket.rooms) {
          if (room.startsWith('admin_session_')) socket.leave(room);
        }
        socket.join(`admin_session_${decoded.sessionId}`);
      } catch (error) {
        // Invalid or expired credentials must never join a device room.
      }
    });

    // Customer joins a room specific to their order ID for live tracking
    socket.on('join_order_room', (orderId) => {
      if (orderId) {
        socket.join(`order_${orderId}`);
        console.log(`[Socket]: ${socket.id} joined order_${orderId}`);
      }
    });

    socket.on('call_waiter', (data) => {
      // data should contain { tableNumber, message }
      console.log(`[Socket]: ${socket.id} called waiter for table ${data.tableNumber}`);
      io.to('admin_room').emit('waiter_called', data);
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

module.exports = { initSocket, getIO, scopeForStation };
