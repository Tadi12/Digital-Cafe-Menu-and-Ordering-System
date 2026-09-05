import React, { createContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const normalizeLang = (lng) => (lng || 'en').split('-')[0];
  const [currentLang, setCurrentLang] = useState(
    normalizeLang(i18n.resolvedLanguage || i18n.language)
  );

  useEffect(() => {
    const syncLanguage = (language) => setCurrentLang(normalizeLang(language));
    i18n.on('languageChanged', syncLanguage);
    syncLanguage(i18n.resolvedLanguage || i18n.language);

    return () => i18n.off('languageChanged', syncLanguage);
  }, [i18n]);

  const changeLanguage = async (lang) => {
    await i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  return (
    <LanguageContext.Provider value={{ currentLang, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
