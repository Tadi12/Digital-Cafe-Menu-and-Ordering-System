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
    const path = location.pathname;
    
    if (path.includes("/dashboard")) return t("admin_page_dashboard");
    if (path.includes("/orders")) return t("admin_page_orders");
    if (path.includes("/foods")) return t("admin_page_foods");
    if (path.includes("/drinks")) return t("admin_page_drinks");
    if (path.includes("/categories")) return t("admin_page_categories");
    if (path.includes("/tables")) return t("admin_page_tables");
    if (path.includes("/analytics")) return t("admin_page_analytics");
    if (path.includes("/staff")) return "Staff Management";
    if (path.includes("/devices")) return t("admin_page_devices");
    if (path.includes("/settings")) return "Cafe Settings";
    if (path.includes("/profile")) return t("profile");

    return t("admin_portal");
  };

  return (
    <div className="min-h-screen bg-cafe-50 flex">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-16 lg:pl-64 flex flex-col min-w-0">
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
