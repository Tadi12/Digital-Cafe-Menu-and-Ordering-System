import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Loader2, RefreshCw } from 'lucide-react';
import { ensureFreshCoordinates } from '../../utils/geolocation';

const REASON_TO_MESSAGE_KEY = {
  unsupported: 'geofence_unsupported',
  insecure: 'geofence_insecure',
  denied: 'geofence_denied',
  unavailable: 'geofence_unavailable',
  timeout: 'geofence_unavailable',
};

// Blocks the customer app until the device reports a position. The API applies
// the same check independently, so this screen is about a clear explanation
// rather than enforcement.
const CustomerAccessGate = ({ children }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState('checking');
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState(null);

  const checkLocation = useCallback(async () => {
    setStatus('checking');
    const result = await ensureFreshCoordinates({ force: true });

    if (result.ok) {
      setStatus('granted');
      setReason(null);
      return;
    }

    setStatus('denied');
    setReason(result.reason);
    setDetails(result.details ? `${result.code}: ${result.details}` : null);
  }, []);

  useEffect(() => {
    checkLocation();

    // Re-check when the customer returns to the tab. Someone who opened the menu
    // inside, walked out, and came back should not inherit the earlier check.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkLocation();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [checkLocation]);

  if (status === 'checking') {
    return (
      <div className="fixed inset-0 bg-cafe-50 dark:bg-recipe-bg z-50 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cafe-600 animate-spin mx-auto" />
          <p className="mt-4 text-cafe-700 dark:text-cafe-100 text-sm">{t('geofence_checking')}</p>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="fixed inset-0 bg-cafe-50 dark:bg-recipe-bg z-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-cafe-200 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-cafe-100 text-cafe-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-bold text-cafe-900 mb-2">
            {t('geofence_outside_title')}
          </h2>
          <p className="text-cafe-600 mb-8 text-sm">
            {t(REASON_TO_MESSAGE_KEY[reason] || 'geofence_outside_message')}
          </p>
          {details && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-6 text-left break-words">
              <strong>Raw Error:</strong> {details}
            </div>
          )}

          <button
            type="button"
            onClick={checkLocation}
            className="w-full bg-cafe-800 text-white font-bold py-4 rounded-xl hover:bg-cafe-900 transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t('geofence_retry')}
          </button>
        </div>
      </div>
    );
  }

  return children;
};
export default CustomerAccessGate;