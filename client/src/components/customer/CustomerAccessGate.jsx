import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosClient from '../../api/axiosClient';
import { Lock, Coffee } from 'lucide-react';

const CustomerAccessGate = ({ children }) => {
  const { t } = useTranslation();
  const [hasAccess, setHasAccess] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const isUnlocked = localStorage.getItem('cafe_pin_accessed') === 'true';
    if (isUnlocked) {
      setHasAccess(true);
    }
    setLoading(false);
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setVerifying(true);
    try {
      const res = await axiosClient.post('/settings/validate', { pin });
      if (res.data?.success) {
        localStorage.setItem('cafe_pin_accessed', 'true');
        setHasAccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('invalid_pin'));
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return null;

  if (!hasAccess) {
    return (
      <div className="fixed inset-0 bg-cafe-50 z-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-cafe-200 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-cafe-100 text-cafe-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-bold text-cafe-900 mb-2">{t('cafe_menu_access')}</h2>
          <p className="text-cafe-600 mb-8 text-sm">{t('pin_instruction')}</p>
          
          {error && <div className="text-red-500 bg-red-50 p-3 rounded-xl mb-6 text-sm">{error}</div>}
          
          <form onSubmit={handleVerify}>
            <input 
              type="text" 
              maxLength={4}
              placeholder="0 0 0 0"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full border-2 border-cafe-200 rounded-2xl px-4 py-4 text-center text-3xl font-bold tracking-[0.5em] mb-6 focus:border-cafe-500 focus:outline-none"
              required
            />
            <button 
              type="submit" 
              disabled={verifying || pin.length < 4}
              className="w-full bg-cafe-800 text-white font-bold py-4 rounded-xl hover:bg-cafe-900 transition disabled:opacity-50"
            >
              {verifying ? t('verifying') : t('unlock_menu')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children;
};
export default CustomerAccessGate;
