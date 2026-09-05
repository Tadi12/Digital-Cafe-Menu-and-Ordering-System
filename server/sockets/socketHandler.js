let ioInstance = null;

const initSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[Socket Connected]: ${socket.id}`);

    // Admin joins the admin room for all real-time order alerts
    socket.on('join_admin_room', () => {
      socket.join('admin_room');
      console.log(`[Socket]: ${socket.id} joined admin_room`);
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
