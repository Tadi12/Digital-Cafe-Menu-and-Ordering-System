import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminNavbar from '../components/admin/AdminNavbar';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/admin/dashboard':
        return 'Dashboard Overview';
      case '/admin/orders':
        return 'Live Orders Queue';
      case '/admin/foods':
        return 'Food Menu Management';
      case '/admin/categories':
        return 'Category Management';
      case '/admin/tables':
        return 'Tables & QR Codes';
      case '/admin/analytics':
        return 'Analytics & Reports';
      default:
        return 'Admin Portal';
    }
  };

  return (
    <div className="min-h-screen bg-cafe-50 flex">
      {/* Sidebar */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
