import React from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import CallWaiterButton from '../customer/CallWaiterButton';

/**
 * The shared customer header.
 *
 * `tableNumber` is optional rather than read from a store: only a page that has
 * actually resolved the guest's table knows it, and a bell is worse than no bell if
 * it rings for a table the guest has left. Passing it in keeps that guarantee
 * explicit — a page without a table simply renders no bell.
 */
const Header = ({ tableNumber }) => {
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
          {/* Ringing the floor is a global guest action, so it lives in the chrome
              rather than on one page, and stays reachable from the menu, the
              orders list and the tracker alike. It renders nothing without a
              table, so a page that cannot resolve one is unaffected. */}
          <CallWaiterButton tableNumber={tableNumber} />
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
};

export default Header;
