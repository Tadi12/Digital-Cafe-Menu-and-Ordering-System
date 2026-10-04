import React from 'react';
import { useTranslation } from 'react-i18next';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

/**
 * The app's one and only loading animation.
 *
 * Every screen that waits on the API should render this rather than plain
 * "Loading..." text — a page that shows static text while a request is in flight
 * reads as broken, not busy.
 *
 * @param {string}  [message]  translated status line; defaults to the menu copy
 * @param {boolean} [compact]  smaller, tighter variant for use *inside* a card,
 *                             table body or panel. The default is for replacing
 *                             a whole page, so it must not be used inline or it
 *                             will blow the surrounding layout apart.
 */
const LoadingSpinner = ({ message, compact = false }) => {
  const { t } = useTranslation();
  const displayMessage = message ?? t('loading_menu');

  // Animation file: client/public/catering(Fork & Knife).lottie → served at /catering(Fork%20&%20Knife).lottie
  const animationSrc = "/catering(Fork%20&%20Knife).lottie";

  if (compact) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-1.5 py-6 text-center"
        role="status"
        aria-live="polite"
      >
        <DotLottieReact src={animationSrc} loop autoplay className="w-10 h-10" />
        <p className="text-xs font-medium text-cafe-600 animate-pulse">{displayMessage}</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center p-8 min-h-[250px] text-center"
      role="status"
      aria-live="polite"
    >
      <DotLottieReact src={animationSrc} loop autoplay className="w-24 h-24 mb-3" />
      <p className="text-sm font-medium text-cafe-700 animate-pulse">{displayMessage}</p>
    </div>
  );
};

export default LoadingSpinner;
