import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { Menu, LogOut, Radio } from 'lucide-react';

const AdminNavbar = ({ onOpenSidebar, pageTitle }) => {
  const { admin, logout } = useAuth();
  const { connected } = useSocket();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-cafe-200 px-4 py-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 rounded-lg text-cafe-700 hover:bg-cafe-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-cafe-900 tracking-tight">{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Socket Connection Status */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
            title={connected ? 'Real-time WebSocket Live' : 'Real-time Socket Disconnected'}
          >
            <Radio className={`w-3 h-3 ${connected ? 'animate-pulse text-emerald-600' : ''}`} />
            <span>{connected ? 'Live Sync' : 'Offline'}</span>
          </div>

          <LanguageSwitcher />

          {/* Admin Profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-cafe-200">
            <span className="hidden md:inline-block text-xs font-bold text-cafe-800">
              {admin?.name}
            </span>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-cafe-600 hover:text-red-600 hover:bg-red-50 transition-colors"
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
