import React, { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { playNotificationSound } from '../utils/soundPlayer';

export const SocketContext = createContext();

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket Connected]:', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket Disconnected]');
      setConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinAdminRoom = () => {
    if (socket && connected) {
      socket.emit('join_admin_room');
    }
  };

  const joinOrderRoom = (orderId) => {
    if (socket && connected && orderId) {
      socket.emit('join_order_room', orderId);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        joinAdminRoom,
        joinOrderRoom,
        playNotificationSound,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
