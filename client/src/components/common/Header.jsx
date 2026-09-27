import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import { Coffee } from 'lucide-react';

const Header = () => {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 bg-cafe-900 text-white shadow-md border-b border-cafe-700 dark:border-transparent dark:bg-gradient-to-br dark:from-recipe-orange dark:to-recipe-orangeDark dark:shadow-lg dark:text-[#17181c]">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cafe-600 flex items-center justify-center text-amber-300 shadow dark:bg-black/15 dark:text-[#17181c]">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-base font-bold tracking-tight text-cafe-50 leading-tight dark:text-[#17181c]">
              {t('app_name')}
            </h1>
            <p className="text-[10px] text-cafe-300 uppercase tracking-widest font-medium dark:text-[#17181c]/75">
              {t('app_subname')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
};

export default Header;
