import React from 'react';
import { useTranslation } from 'react-i18next';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const LoadingSpinner = ({ message }) => {
  const { t } = useTranslation();
  const displayMessage = message ?? t('loading_menu');
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[250px] text-center">
      {/* Animation file: client/public/catering(Fork & Knife).lottie → served at /catering(Fork%20&%20Knife).lottie */}
      <DotLottieReact
        src="/catering(Fork%20&%20Knife).lottie"
        loop
        autoplay
        className="w-24 h-24 mb-3"
      />
      <p className="text-sm font-medium text-cafe-700 animate-pulse">{displayMessage}</p>
    </div>
  );
};

export default LoadingSpinner;
