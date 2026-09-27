import React from 'react';
import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Rounded pill toggle that flips the app between the warm light theme and the
 * dark "recipe app" inspired theme.
 */
const ThemeToggle = ({ className = '' }) => {
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();

  const label = isDark ? t('theme_switch_to_light') : t('theme_switch_to_dark');

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-cafe-700 bg-cafe-800 text-amber-300 transition-colors hover:bg-cafe-700 hover:text-amber-200 dark:border-recipe-border dark:bg-recipe-pill dark:text-recipe-orange dark:hover:bg-recipe-cardHover dark:hover:text-amber-200 ${className}`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
};

export default ThemeToggle;
