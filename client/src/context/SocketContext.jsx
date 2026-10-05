import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import {
  playNotificationSound,
  playWaiterNotificationSound,
} from '../utils/soundPlayer';

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

  /**
   * Join the whole-cafe order feed. The server verifies the token, checks the
   * session is still live, and allows only management roles, so this cannot be
   * used to read another cafe's traffic. The token is read here rather than taken
   * as an argument so every caller gets it right.
   */
  const joinAdminRoom = useCallback(() => {
    const token = localStorage.getItem('cafe_admin_token');
    if (socket && connected && token) {
      socket.emit('join_admin_room', token);
    }
  }, [socket, connected]);

  /**
   * Join the room for the half of the order this staff member prepares (the chef's
   * food tickets, the barista's drink tickets). The server derives the room from the
   * token, so this cannot be used to subscribe to the other station's items.
   */
  const joinStationRoom = useCallback(() => {
    const token = localStorage.getItem('cafe_admin_token');
    if (socket && connected && token) {
      socket.emit('join_station_room', token);
    }
  }, [socket, connected]);

  /**
   * Join the private feed for the signed-in waiter's own tables. The server
   * verifies the token, checks the role is 'waiter', and derives the room from the
   * user id — so no unrelated table updates are ever delivered.
   */
  const joinWaiterRoom = useCallback(() => {
    const token = localStorage.getItem('cafe_admin_token');
    if (socket && connected && token) {
      socket.emit('join_waiter_room', token);
    }
  }, [socket, connected]);

  /**
   * Join the live feed for one order the customer placed.
   *
   * The server checks the presented `customerSessionId` against the value stored on
   * the order, so an order id alone is not enough to subscribe to somebody else's
   * tracking screen. The id is stored per device in the cart store.
   *
   * @param {string} orderId
   * @param {string} customerSessionId
   */
  const joinOrderRoom = useCallback(
    (orderId, customerSessionId) => {
      if (socket && connected && orderId) {
        socket.emit('join_order_room', orderId, customerSessionId);
      }
    },
    [socket, connected],
  );

  // Memoized so a context consumer does not re-render on every provider render —
  // these callbacks also appear in effect dependency arrays downstream, where an
  // unstable identity would tear down and re-register socket listeners.
  const value = useMemo(
    () => ({
      socket,
      connected,
      joinAdminRoom,
      joinStationRoom,
      joinWaiterRoom,
      joinOrderRoom,
      playNotificationSound,
      playWaiterNotificationSound,
    }),
    [
      socket,
      connected,
      joinAdminRoom,
      joinStationRoom,
      joinWaiterRoom,
      joinOrderRoom,
    ],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
