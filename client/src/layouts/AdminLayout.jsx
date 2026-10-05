import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { staffAreaTitle, staffBrandLabel } from "../utils/staffRoles";
import AdminSidebar from "../components/admin/AdminSidebar";
import AdminNavbar from "../components/admin/AdminNavbar";

/**
 * Which area of the staff app a URL is showing.
 *
 * This only recognises the area; it deliberately does not decide the wording. The
 * title is resolved by staffAreaTitle() for the signed-in role, so the same URL
 * reads as "Kitchen Orders" for a chef and "Live Orders Queue" for an admin.
 *
 * Order matters: /orders is checked before /tables so nothing shadows anything
 * else, and the first match wins, so the list must stay in this order.
 */
const getPageArea = (path) => {
  if (path.includes("/dashboard")) return "dashboard";
  if (path.includes("/orders")) return "orders";
  if (path.includes("/foods")) return "foods";
  if (path.includes("/drinks")) return "drinks";
  if (path.includes("/categories")) return "categories";
  if (path.includes("/tables")) return "tables";
  if (path.includes("/analytics")) return "analytics";
  if (path.includes("/staff")) return "staff";
  if (path.includes("/devices")) return "devices";
  if (path.includes("/settings")) return "settings";
  if (path.includes("/profile")) return "profile";
  return null;
};

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const { admin } = useAuth();

  const role = admin?.role;
  const area = getPageArea(location.pathname);

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
          // Both strings are resolved from the same role read here, so the heading
          // and the badge beneath it can never describe two different people.
          pageTitle={staffAreaTitle(role, area, t)}
          roleLabel={staffBrandLabel(role, t)}
        />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
