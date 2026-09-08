import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layouts
import CustomerLayout from "../layouts/CustomerLayout";
import AdminLayout from "../layouts/AdminLayout";
import ProtectedRoute from "./ProtectedRoute";

// Customer Pages
import MenuPage from "../pages/customer/MenuPage";
import OrderConfirmationPage from "../pages/customer/OrderConfirmationPage";
import OrderTrackerPage from "../pages/customer/OrderTrackerPage";

// Admin Pages
import AdminLoginPage from "../pages/admin/AdminLoginPage";
import ForgotPasswordPage from "../pages/admin/ForgotPasswordPage";
import ResetPasswordPage from "../pages/admin/ResetPasswordPage";
import DashboardPage from "../pages/admin/DashboardPage";
import FoodManagerPage from "../pages/admin/FoodManagerPage";
import DrinkManagerPage from "../pages/admin/DrinkManagerPage";
import CategoryManagerPage from "../pages/admin/CategoryManagerPage";
import TableManagerPage from "../pages/admin/TableManagerPage";
import OrderManagerPage from "../pages/admin/OrderManagerPage";
import AnalyticsPage from "../pages/admin/AnalyticsPage";
import AdminProfilePage from "../pages/admin/AdminProfilePage";
// Profile route will be added inside admin routes below

const AppRoutes = () => {
  return (
    <Routes>
      {/* Customer Routes */}
      <Route element={<CustomerLayout />}>
        <Route path="/menu/table/:tableId" element={<MenuPage />} />
        <Route
          path="/order-confirmation/:orderId"
          element={<OrderConfirmationPage />}
        />
        <Route path="/order-track/:orderId" element={<OrderTrackerPage />} />
      </Route>

      {/* Admin Auth Route */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        path="/admin/reset-password/:token"
        element={<ResetPasswordPage />}
      />

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
        </Route>
      </Route>

      {/* Default Catch-all */}
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
