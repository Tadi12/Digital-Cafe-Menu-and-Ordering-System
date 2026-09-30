import React from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Coffee,
  Layers,
  QrCode,
  ClipboardList,
  BarChart3,
  User,
  MonitorSmartphone,
  LogOut,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const AdminSidebar = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { logout, admin } = useAuth();
  const role = admin?.role || 'waiter'; // fallback to waiter if undefined

  const allNavItems = [
    { path: "/admin/dashboard", label: t("dashboard"), icon: LayoutDashboard, roles: ['super_admin', 'admin', 'chef', 'waiter'] },
    {
      path: "/admin/orders",
      label: t("order_management"),
      icon: ClipboardList,
      roles: ['super_admin', 'admin', 'chef', 'waiter'],
    },
    {
      path: "/admin/foods",
      label: t("food_management"),
      icon: UtensilsCrossed,
      roles: ['super_admin', 'admin'],
    },
    { path: "/admin/drinks", label: t("drink_management"), icon: Coffee, roles: ['super_admin', 'admin'] },
    {
      path: "/admin/categories",
      label: t("category_management"),
      icon: Layers,
      roles: ['super_admin', 'admin'],
    },
    { path: "/admin/tables", label: t("table_management"), icon: QrCode, roles: ['super_admin', 'admin'] },
    { path: "/admin/analytics", label: t("analytics"), icon: BarChart3, roles: ['super_admin', 'admin'] },
    { path: "/admin/profile", label: t("profile"), icon: User, roles: ['super_admin', 'admin', 'chef', 'waiter'] },
    { path: "/admin/staff", label: "Staff Management", icon: User, roles: ['super_admin', 'admin'] },
    { path: "/admin/devices", label: t("admin_page_devices"), icon: MonitorSmartphone, roles: ['super_admin', 'admin'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(role));

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-cafe-900 text-white flex flex-col transition-[width,transform] duration-300 md:w-16 lg:w-64 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand header */}
        <div className="p-4 border-b border-cafe-800 flex items-center justify-between md:justify-center lg:justify-between">
            <div className="flex items-center gap-3 md:justify-center lg:justify-start">
            <div className="w-9 h-9 rounded-xl bg-cafe-600 flex items-center justify-center text-amber-300 shadow">
              <Coffee className="w-5 h-5" />
            </div>
            <div className="md:hidden lg:block">
              <h2 className="font-display text-sm font-bold tracking-tight text-white">
                {t("admin_sidebar_title")}
              </h2>
              <p className="text-[10px] text-cafe-300 uppercase tracking-wider font-semibold">
                {t("management_portal")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden md:hidden min-h-10 min-w-10 text-cafe-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `relative flex min-h-10 items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-colors md:justify-center md:px-0 lg:justify-start lg:px-3.5 ${
                    isActive
                      ? "bg-cafe-700 text-white shadow before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-gold-500"
                      : "text-cafe-300 hover:bg-cafe-800 hover:text-white dark:hover:bg-recipe-cardHover"
                  }`
                }
                title={item.label}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="md:hidden lg:inline">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-cafe-800 p-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            title={t("logout")}
            className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold text-cafe-300 transition-colors hover:bg-red-500/15 hover:text-red-300 md:justify-center md:px-0 lg:justify-start lg:px-3.5"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="md:hidden lg:inline">{t("logout_action")}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;

