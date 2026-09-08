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
  X,
} from "lucide-react";

const AdminSidebar = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  const navItems = [
    { path: "/admin/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    {
      path: "/admin/orders",
      label: t("order_management"),
      icon: ClipboardList,
    },
    {
      path: "/admin/foods",
      label: t("food_management"),
      icon: UtensilsCrossed,
    },
    { path: "/admin/drinks", label: t("drink_management"), icon: Coffee },
    {
      path: "/admin/categories",
      label: t("category_management"),
      icon: Layers,
    },
    { path: "/admin/tables", label: t("table_management"), icon: QrCode },
    { path: "/admin/analytics", label: t("analytics"), icon: BarChart3 },
    { path: "/admin/profile", label: t("profile"), icon: User },
  ];

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
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-cafe-900 text-white flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="p-4 border-b border-cafe-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cafe-600 flex items-center justify-center text-amber-300 shadow">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white">
                Hable Cafe Admin
              </h2>
              <p className="text-[10px] text-cafe-300 uppercase tracking-wider font-semibold">
                Management Portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-cafe-400 hover:text-white p-1"
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
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-colors ${
                    isActive
                      ? "bg-cafe-700 text-white shadow"
                      : "text-cafe-300 hover:bg-cafe-800 hover:text-white"
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default AdminSidebar;
