import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Loader2, ArrowRight } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { resolveApiError } from '../../utils/apiError';

const CustomerAccessGate = ({ children }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState('checking'); // checking, required, granted
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkExistingPin = async () => {
      const savedPin = localStorage.getItem('cafe_client_pin');
      if (!savedPin) {
        setStatus('required');
        return;
      }

      try {
        const res = await axiosClient.post('/settings/validate', { pin: savedPin });
        if (res.data.success) {
          setStatus('granted');
        } else {
          localStorage.removeItem('cafe_client_pin');
          setStatus('required');
        }
      } catch (err) {
        // If it's a 403, the pin is invalid. If it's a 500, let them try again.
        if (err.response && err.response.status === 403) {
          localStorage.removeItem('cafe_client_pin');
          setStatus('required');
        } else {
          // If network is down or something, let them pass and let the downstream requests fail
          setStatus('granted'); 
        }
      }
    };
    checkExistingPin();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!pin.trim()) return;

    setSubmitting(true);
    try {
      const res = await axiosClient.post('/settings/validate', { pin });
      if (res.data.success) {
        localStorage.setItem('cafe_client_pin', pin);
        setStatus('granted');
      }
    } catch (err) {
      // A 403 means the code itself was wrong; the API also returns PIN_REQUIRED for
      // it. Anything else goes through the shared resolver so the guest sees a
      // translated string rather than the server's English message.
      if (err.response?.status === 403) {
        setError(t('invalid_pin'));
      } else {
        setError(resolveApiError(err, t, 'error_general'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'checking') {
    return (
      <div className="fixed inset-0 bg-cafe-50 dark:bg-recipe-bg z-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-cafe-600 animate-spin mx-auto" />
        <p className="mt-4 text-sm font-medium text-cafe-600 dark:text-recipe-muted">
          {t('checking_menu_access')}
        </p>
      </div>
    );
  }

  if (status === 'required') {
    return (
      <div className="fixed inset-0 bg-cafe-50 dark:bg-recipe-bg z-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-cafe-200 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-cafe-100 text-cafe-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-bold text-cafe-900 mb-2">
            {t('cafe_menu_access')}
          </h2>
          <p className="text-cafe-600 mb-8 text-sm">
            {t('pin_instruction')}
          </p>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={t('pin_placeholder')}
              className="w-full bg-cafe-50 border border-cafe-200 rounded-xl px-4 py-3 text-center text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-gold-500"
              maxLength={10}
              disabled={submitting}
              autoFocus
            />
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            <button
              type="submit"
              disabled={submitting || !pin.trim()}
              className="w-full bg-cafe-800 text-white font-bold py-4 rounded-xl hover:bg-cafe-900 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              {submitting ? t('verifying') : t('unlock_menu')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children;
};
export default CustomerAccessGate;