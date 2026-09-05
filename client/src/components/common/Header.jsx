import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { Coffee } from 'lucide-react';

const Header = () => {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 bg-cafe-900 text-white shadow-md border-b border-cafe-700">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cafe-600 flex items-center justify-center text-amber-300 shadow">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-cream-50 leading-tight">
              {t('app_name')}
            </h1>
            <p className="text-[10px] text-cafe-300 uppercase tracking-widest font-medium">
              Digital Menu
            </p>
          </div>
        </div>

        <LanguageSwitcher />
      </div>
    </header>
  );
};

export default Header;
