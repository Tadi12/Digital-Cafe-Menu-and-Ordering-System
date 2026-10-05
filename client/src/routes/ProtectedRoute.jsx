import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { staffHomePath, staffLoginPath } from '../utils/staffRoles';

/**
 * Gate for the role-specific application areas.
 *
 * This is CONVENIENCE, NOT SECURITY. It saves a signed-in user from landing on a
 * screen that is not theirs, and it keeps an anonymous visitor off staff pages. The
 * actual authorization lives on the API: every admin-only endpoint sits behind
 * `protectAdmin` plus `requireRole(MANAGEMENT_ROLES)` (see routes/*.js and
 * middleware/authMiddleware.js), which is what a caller cannot talk their way past.
 * Client-side guards exist to produce a sensible redirect, not to withhold data.
 *
 * The role is read from the Admin document `protectAdmin` loaded from the database,
 * so it is never taken from a URL, a query string or the form.
 */
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

  // No session: send them to the single shared login page, never to an
  // area-specific one. `/admin/login` is gone — see the legacy redirect in
  // AppRoutes.jsx for old links into it.
  if (!admin) {
    return <Navigate to={staffLoginPath} replace />;
  }

  // The wrong role for this area. Bounce them to their OWN dashboard rather than
  // showing a refusal screen: staffHomePath() is the same helper the login page
  // uses, so the destination cannot disagree with the guards protecting it. It is
  // also what makes typing another role's URL harmless — a waiter who enters
  // /chef/orders ends up on /waiter/dashboard instead of a dead end.
  if (allowedRoles.length > 0 && !allowedRoles.includes(admin.role)) {
    return <Navigate to={staffHomePath(admin.role)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;