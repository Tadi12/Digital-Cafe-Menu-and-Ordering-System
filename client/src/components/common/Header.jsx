import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';

const Header = () => {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 bg-cafe-900 text-white shadow-md border-b border-cafe-700 dark:border-transparent dark:bg-gradient-to-br dark:from-recipe-orange dark:to-recipe-orangeDark dark:shadow-lg dark:text-[#17181c]">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* Brand mark sits on the dark header, so the badge is shown on its
              own rather than inside the old brown tile. The name is already
              announced by the heading below, hence the empty alt. */}
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            className="h-8 w-8 shrink-0 rounded-full object-cover shadow"
          />
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
