import React from 'react';
import { Coffee } from 'lucide-react';

const LoadingSpinner = ({ message = 'Loading digital menu...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[250px] text-center">
      <div className="relative flex items-center justify-center mb-3">
        <div className="w-12 h-12 rounded-full border-4 border-cafe-200 border-t-cafe-600 animate-spin"></div>
        <Coffee className="w-5 h-5 text-cafe-700 absolute" />
      </div>
      <p className="text-sm font-medium text-cafe-700 animate-pulse">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
