import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { useTranslation } from 'react-i18next';

const SettingsPage = () => {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axiosClient.get('/settings');
        if (res.data?.success) {
          setPin(res.data.data.accessPin);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccess('');
    try {
      const res = await axiosClient.put('/settings', { accessPin: pin });
      if (res.data?.success) {
        setSuccess(t('access_pin_updated'));
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8">{t('loading')}</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-cafe-900">{t('settings_title')}</h1>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-cafe-200">
        <h2 className="text-lg font-semibold mb-4">{t('access_pin_title')}</h2>
        <p className="text-sm text-cafe-600 mb-6">
          {t('access_pin_description')}

        </p>
        
        {success && <div className="text-green-600 bg-green-50 p-3 rounded-xl mb-4">{success}</div>}
        
        <form onSubmit={handleSave} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-cafe-700 mb-2">{t('current_pin')}</label>
            <input 
              type="text" 
              maxLength={4}
              value={pin} 
              onChange={e => setPin(e.target.value)} 
              className="w-full border rounded-xl px-4 py-3 text-lg font-bold tracking-widest text-center" 
              required 
            />
          </div>
          <button type="submit" className="bg-cafe-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-cafe-900 transition h-12">
            {t('save_pin')}
          </button>
        </form>
      </div>
    </div>
  );
};
export default SettingsPage;
