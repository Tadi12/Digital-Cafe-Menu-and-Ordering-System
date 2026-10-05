import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { t } = useTranslation();
  const { admin, loading } = useAuth();
  const hasToken = Boolean(localStorage.getItem('cafe_admin_token'));

  if (loading || (hasToken && !admin)) {
    return (
      <div className="min-h-screen bg-cafe-50 flex flex-col justify-center">
        <LoadingSpinner message={t('verifying_auth')} />
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  // Check role-based access if allowedRoles is provided
  if (allowedRoles.length > 0 && !allowedRoles.includes(admin.role)) {
    // If they don't have access, redirect them to a safe default page based on their role
    if (admin.role === 'chef') return <Navigate to="/chef/dashboard" replace />;
    if (admin.role === 'barista') return <Navigate to="/barista/dashboard" replace />;
    if (admin.role === 'waiter') return <Navigate to="/waiter/dashboard" replace />;
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
