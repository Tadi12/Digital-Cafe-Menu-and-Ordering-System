import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";

// Layouts
import CustomerLayout from "../layouts/CustomerLayout";
import AdminLayout from "../layouts/AdminLayout";
import ProtectedRoute from "./ProtectedRoute";
import { staffLoginPath } from "../utils/staffRoles";
import LoadingSpinner from "../components/common/LoadingSpinner";

// Customer Pages (eager — primary QR-menu entry, keep first paint fast)
import MenuPage from "../pages/customer/MenuPage";
import LandingPage from "../pages/LandingPage";
import OrderConfirmationPage from "../pages/customer/OrderConfirmationPage";
import OrderTrackerPage from "../pages/customer/OrderTrackerPage";
import MyOrdersPage from "../pages/customer/MyOrdersPage";
import FavoritesPage from "../pages/customer/FavoritesPage";

// Admin Pages (lazy — customers never download these; recharts splits out too)
const LoginPage = lazy(() => import("../pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("../pages/admin/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../pages/admin/ResetPasswordPage"));
const DashboardPage = lazy(() => import("../pages/admin/DashboardPage"));
const WaiterTablesPage = lazy(() => import("../pages/admin/WaiterTablesPage"));
const FoodManagerPage = lazy(() => import("../pages/admin/FoodManagerPage"));
const DrinkManagerPage = lazy(() => import("../pages/admin/DrinkManagerPage"));
const CategoryManagerPage = lazy(() => import("../pages/admin/CategoryManagerPage"));
const TableManagerPage = lazy(() => import("../pages/admin/TableManagerPage"));
const OrderManagerPage = lazy(() => import("../pages/admin/OrderManagerPage"));
const AnalyticsPage = lazy(() => import("../pages/admin/AnalyticsPage"));
const AdminProfilePage = lazy(() => import("../pages/admin/AdminProfilePage"));
const AdminDevicesPage = lazy(() => import("../pages/admin/AdminDevicesPage"));
const StaffManagerPage = lazy(() => import("../pages/admin/StaffManagerPage"));
const SettingsPage = lazy(() => import("../pages/admin/SettingsPage"));

import StatusErrorPage from "../pages/errors/StatusErrorPage";

/**
 * Forwards an old emailed reset link to its new home.
 *
 * Password reset URLs are pasted into inboxes and chat logs and live for 30
 * minutes, so the ones already sent out must keep working after the move. The token
 * is carried across rather than dropped, which a literal `<Navigate to="...">` would
 * not do — it treats the string as a path, colon and all.
 */
const LegacyResetPasswordRedirect = () => {
  const { token } = useParams();
  return <Navigate to={`/reset-password/${token}`} replace />;
};

const AppRoutes = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cafe-50 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <Routes>
      {/* Public Landing */}
      <Route path="/" element={<LandingPage />} />

      {/* Customer Routes */}
      <Route element={<CustomerLayout />}>
        <Route path="/menu/table/:tableId" element={<MenuPage />} />
        <Route
          path="/order-confirmation/:orderId"
          element={<OrderConfirmationPage />}
        />
        <Route path="/order-track/:orderId" element={<OrderTrackerPage />} />
        <Route path="/my-orders" element={<MyOrdersPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
      </Route>

      {/* ------------------------------------------------------------------
          Auth routes — ONE login, for every role.

          These are deliberately at the top level rather than under /admin. /admin
          is a protected application area, so an auth route beneath it is both a
          naming lie and a trap for the route guards: a guard that protects /admin
          would have to special-case its own login page.

          The form has no role field. The role comes back from the server after the
          credentials are verified, and staffHomePath() turns it into a destination.
      ------------------------------------------------------------------ */}
      <Route path={staffLoginPath} element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      {/* Legacy auth paths. These were the real URLs for years and the reset link
          is emailed to staff, so they cannot simply be deleted: an old link in an
          old inbox would 404. Each one forwards to its new home and keeps working. */}
      <Route path="/admin/login" element={<Navigate to={staffLoginPath} replace />} />
      <Route
        path="/admin/forgot-password"
        element={<Navigate to="/forgot-password" replace />}
      />
      {/* Needs the token forwarded intact, and `<Navigate to="/x/:id">` treats the
          string literally — it does not substitute params. Hence a component. */}
      <Route
        path="/admin/reset-password/:token"
        element={<LegacyResetPasswordRedirect />}
      />

      {/* Protected Chef Routes */}
      <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'chef']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/chef" element={<Navigate to="/chef/dashboard" replace />} />
          <Route path="/chef/dashboard" element={<DashboardPage />} />
          <Route path="/chef/orders" element={<OrderManagerPage />} />
          <Route path="/chef/profile" element={<AdminProfilePage />} />
        </Route>
      </Route>

      {/* Protected Barista Routes */}
      <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'barista']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/barista" element={<Navigate to="/barista/dashboard" replace />} />
          <Route path="/barista/dashboard" element={<DashboardPage />} />
          <Route path="/barista/orders" element={<OrderManagerPage />} />
          <Route path="/barista/profile" element={<AdminProfilePage />} />
        </Route>
      </Route>

      {/* Protected Waiter Routes */}
      <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'waiter']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/waiter" element={<Navigate to="/waiter/dashboard" replace />} />
          <Route path="/waiter/dashboard" element={<DashboardPage />} />
          <Route path="/waiter/orders" element={<OrderManagerPage />} />
          <Route path="/waiter/tables" element={<WaiterTablesPage />} />
          <Route path="/waiter/profile" element={<AdminProfilePage />} />
        </Route>
      </Route>

      {/* Protected Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}>
        <Route element={<AdminLayout />}>
          <Route
            path="/admin"
            element={<Navigate to="/admin/dashboard" replace />}
          />
          <Route path="/admin/dashboard" element={<DashboardPage />} />
          <Route path="/admin/orders" element={<OrderManagerPage />} />
          <Route path="/admin/foods" element={<FoodManagerPage />} />
          <Route path="/admin/drinks" element={<DrinkManagerPage />} />
          <Route path="/admin/categories" element={<CategoryManagerPage />} />
          <Route path="/admin/tables" element={<TableManagerPage />} />
          <Route path="/admin/analytics" element={<AnalyticsPage />} />
          <Route path="/admin/profile" element={<AdminProfilePage />} />
          <Route path="/admin/devices" element={<AdminDevicesPage />} />
          <Route path="/admin/staff" element={<StaffManagerPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Default Catch-all */}
      <Route path="*" element={<StatusErrorPage type="notFound" />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;



