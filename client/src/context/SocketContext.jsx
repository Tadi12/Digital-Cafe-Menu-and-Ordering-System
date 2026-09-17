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

    const registerAdminSession = () => {
      const token = localStorage.getItem('cafe_admin_token');
      if (token) socketInstance.emit('register_admin_session', token);
    };

    socketInstance.on('connect', () => {
      console.log('[Socket Connected]:', socketInstance.id);
      setConnected(true);
      registerAdminSession();
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket Disconnected]');
      setConnected(false);
    });

    socketInstance.on('admin_session_terminated', () => {
      localStorage.removeItem('cafe_admin_token');
      window.dispatchEvent(new Event('admin-session-terminated'));
      socketInstance.disconnect();
    });

    const syncAdminSession = () => {
      if (localStorage.getItem('cafe_admin_token')) {
        if (socketInstance.connected) registerAdminSession();
        else socketInstance.connect();
      } else {
        socketInstance.disconnect();
      }
    };
    window.addEventListener('admin-session-changed', syncAdminSession);

    setSocket(socketInstance);

    return () => {
      window.removeEventListener('admin-session-changed', syncAdminSession);
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
