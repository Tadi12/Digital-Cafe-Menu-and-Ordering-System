import React, { createContext, useState, useEffect } from 'react';
import { loginAdminApi, getAdminProfileApi } from '../api/authApi';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('cafe_admin_token');
      if (token) {
        try {
          const res = await getAdminProfileApi();
          if (res.success) {
            setAdmin(res.data);
          } else {
            localStorage.removeItem('cafe_admin_token');
          }
        } catch (err) {
          console.error('[Auth Check Error]:', err);
          localStorage.removeItem('cafe_admin_token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    setError(null);
    try {
      const res = await loginAdminApi(credentials);
      if (res.success) {
        const { token, ...adminProfile } = res.data;
        localStorage.setItem('cafe_admin_token', token);
        setAdmin(adminProfile);
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('cafe_admin_token');
    setAdmin(null);
  };

// Refresh admin profile
const refreshAdmin = async () => {
  try {
    const res = await getAdminProfileApi();
    if (res.success) {
      setAdmin(res.data);
    }
  } catch (err) {
    console.error('Failed to refresh admin profile', err);
  }
};

return (
  <AuthContext.Provider value={{ admin, loading, error, login, logout, refreshAdmin }}>
    {children}
  </AuthContext.Provider>
);

};
