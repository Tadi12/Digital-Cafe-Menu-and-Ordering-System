import React, { useContext } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { Globe } from 'lucide-react';

const LanguageSwitcher = ({ className = '' }) => {
  const { currentLang, changeLanguage } = useContext(LanguageContext);

  const toggleLanguage = () => {
    const nextLang = currentLang === 'en' ? 'am' : 'en';
    changeLanguage(nextLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-cafe-100 text-cafe-800 hover:bg-cafe-200 transition-colors shadow-sm ${className}`}
      title="Switch Language / ቋንቋ ቀይር"
    >
      <Globe className="w-3.5 h-3.5 text-cafe-600" />
      <span>{currentLang === 'en' ? 'English' : 'አማርኛ'}</span>
    </button>
  );
};

export default LanguageSwitcher;
