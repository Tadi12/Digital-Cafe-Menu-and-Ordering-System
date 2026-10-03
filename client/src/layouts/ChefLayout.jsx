import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { ChefHat, LogOut, Radio } from 'lucide-react';
import ThemeToggle from '../components/common/ThemeToggle';
import LanguageSwitcher from '../components/common/LanguageSwitcher';

const ChefLayout = () => {
  const { t } = useTranslation();
  const { logout, admin } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-cafe-50 dark:bg-recipe-bg flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-cafe-200 px-4 py-3 shadow-xs flex items-center justify-between dark:bg-recipe-card dark:border-recipe-border">
        <div className="flex items-center gap-3 text-cafe-900 dark:text-recipe-text">
          <ChefHat className="w-6 h-6 text-orange-500" />
          <h1 className="font-display text-xl font-bold tracking-tight hidden sm:block">
            {t('kitchen_display')}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              connected
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
            }`}
          >
            <Radio className={`w-3 h-3 ${connected ? "animate-pulse" : ""}`} />
            <span className="hidden sm:inline">{connected ? t('live_sync') : t('offline')}</span>
          </div>

          <ThemeToggle />
          <LanguageSwitcher />

          <div className="flex items-center pl-4 border-l border-cafe-200 gap-3 dark:border-recipe-border">
            <span className="text-sm font-bold text-cafe-800 hidden md:inline-block dark:text-recipe-text">
              {admin?.name}
            </span>
            <button
              onClick={handleLogout}
              className="text-cafe-500 hover:text-red-600 transition-colors dark:text-recipe-muted dark:hover:text-red-400"
              title={t('logout')}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 overflow-x-auto p-4 md:p-6 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
};

export default ChefLayout;
