import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layouts
import CustomerLayout from "../layouts/CustomerLayout";
import AdminLayout from "../layouts/AdminLayout";
import ProtectedRoute from "./ProtectedRoute";
import LoadingSpinner from "../components/common/LoadingSpinner";

// Customer Pages (eager — primary QR-menu entry, keep first paint fast)
import MenuPage from "../pages/customer/MenuPage";
import OrderConfirmationPage from "../pages/customer/OrderConfirmationPage";
import OrderTrackerPage from "../pages/customer/OrderTrackerPage";
import MyOrdersPage from "../pages/customer/MyOrdersPage";

// Admin Pages (lazy — customers never download these; recharts splits out too)
const AdminLoginPage = lazy(() => import("../pages/admin/AdminLoginPage"));
const ForgotPasswordPage = lazy(() => import("../pages/admin/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../pages/admin/ResetPasswordPage"));
const DashboardPage = lazy(() => import("../pages/admin/DashboardPage"));
const FoodManagerPage = lazy(() => import("../pages/admin/FoodManagerPage"));
const DrinkManagerPage = lazy(() => import("../pages/admin/DrinkManagerPage"));
const CategoryManagerPage = lazy(() => import("../pages/admin/CategoryManagerPage"));
const TableManagerPage = lazy(() => import("../pages/admin/TableManagerPage"));
const OrderManagerPage = lazy(() => import("../pages/admin/OrderManagerPage"));
const AnalyticsPage = lazy(() => import("../pages/admin/AnalyticsPage"));
const AdminProfilePage = lazy(() => import("../pages/admin/AdminProfilePage"));
const AdminDevicesPage = lazy(() => import("../pages/admin/AdminDevicesPage"));

import StatusErrorPage from "../pages/errors/StatusErrorPage";
// Profile route will be added inside admin routes below

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
      {/* Customer Routes */}
      <Route element={<CustomerLayout />}>
        <Route path="/menu/table/:tableId" element={<MenuPage />} />
        <Route
          path="/order-confirmation/:orderId"
          element={<OrderConfirmationPage />}
        />
        <Route path="/order-track/:orderId" element={<OrderTrackerPage />} />
        <Route path="/my-orders" element={<MyOrdersPage />} />
      </Route>

      {/* Admin Auth Route */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/admin/reset-password/:token" element={<ResetPasswordPage />} />

      {/* Protected Admin Routes */}
      <Route element={<ProtectedRoute />}>
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
        </Route>
      </Route>

      {/* Default Catch-all */}
      <Route path="*" element={<StatusErrorPage type="notFound" />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
