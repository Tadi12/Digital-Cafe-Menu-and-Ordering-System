let ioInstance = null;
const jwt = require('jsonwebtoken');
const AdminSession = require('../models/AdminSession');

const initSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[Socket Connected]: ${socket.id}`);

    // Admin joins the admin room for all real-time order alerts
    socket.on('join_admin_room', () => {
      socket.join('admin_room');
      console.log(`[Socket]: ${socket.id} joined admin_room`);
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

module.exports = { initSocket, getIO };
