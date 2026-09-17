import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminSidebar from "../components/admin/AdminSidebar";
import AdminNavbar from "../components/admin/AdminNavbar";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/admin/dashboard":
        return t("admin_page_dashboard");
      case "/admin/orders":
        return t("admin_page_orders");
      case "/admin/foods":
        return t("admin_page_foods");
      case "/admin/drinks":
        return t("admin_page_drinks");
      case "/admin/categories":
        return t("admin_page_categories");
      case "/admin/tables":
        return t("admin_page_tables");
      case "/admin/analytics":
        return t("admin_page_analytics");
      case "/admin/devices":
        return t("admin_page_devices");
      default:
        return t("admin_portal");
    }
  };

  return (
    <div className="min-h-screen bg-cafe-50 flex">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <AdminNavbar
          onOpenSidebar={() => setSidebarOpen(true)}
          pageTitle={getPageTitle()}
        />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
