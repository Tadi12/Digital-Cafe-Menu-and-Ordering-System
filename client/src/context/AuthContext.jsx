import React, { createContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { loginAdminApi, getAdminProfileApi } from '../api/authApi';
import { resolveApiError } from '../utils/apiError';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { t } = useTranslation();
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

  useEffect(() => {
    const handleSessionTermination = () => {
      localStorage.removeItem('cafe_admin_token');
      setAdmin(null);
      setError(t('session_terminated'));
    };
    window.addEventListener('admin-session-terminated', handleSessionTermination);
    return () => window.removeEventListener('admin-session-terminated', handleSessionTermination);
  }, []);

  const login = async (credentials) => {
    setError(null);
    try {
      const res = await loginAdminApi(credentials);
      if (res.success) {
        const { token, ...adminProfile } = res.data;
        localStorage.setItem('cafe_admin_token', token);
        setAdmin(adminProfile);
        window.dispatchEvent(new Event('admin-session-changed'));
        // The profile is returned as well as stored: the caller navigates on
        // `data.role` straight after login, so returning only `success` left that
        // read undefined and bounced every chef/barista/waiter off the generic
        // dashboard through ProtectedRoute.
        return { success: true, data: adminProfile };
      }
      return { success: false, message: res.message };
    } catch (err) {
      const msg = resolveApiError(err, t, 'login_failed');
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('cafe_admin_token');
    setAdmin(null);
    window.dispatchEvent(new Event('admin-session-changed'));
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
