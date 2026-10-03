import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { useTranslation } from 'react-i18next';

const inputClass = 'w-full border rounded-xl px-4 py-3 text-lg text-center';

const SettingsPage = () => {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);

  const [geofenceEnabled, setGeofenceEnabled] = useState(true);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [radius, setRadius] = useState('200');

  const [pinSuccess, setPinSuccess] = useState('');
  const [fenceSuccess, setFenceSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axiosClient.get('/settings');
        if (res.data?.success) {
          const data = res.data.data;
          setPin(data.accessPin);
          setGeofenceEnabled(data.geofenceEnabled !== false);
          setLat(data.geofenceLat ?? '');
          setLon(data.geofenceLon ?? '');
          setRadius(data.geofenceRadiusM ?? 200);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSavePin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axiosClient.put('/settings', { accessPin: pin });
      if (res.data?.success) {
        setPinSuccess(t('access_pin_updated'));
        setTimeout(() => setPinSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || t('failed_create_staff'));
    }
  };

  const handleSaveFence = async (e) => {
    e.preventDefault();
    setError('');
    setFenceSuccess('');
    try {
      // Only send the centre when both fields are filled in, so the API
      // validates the pair together instead of half-writing the fence.
      const payload = { geofenceEnabled, geofenceRadiusM: radius };

      if (lat !== '' && lon !== '') {
        payload.geofenceLat = lat;
        payload.geofenceLon = lon;
      }

      const res = await axiosClient.put('/settings', payload);
      if (res.data?.success) {
        setFenceSuccess(t('geofence_settings_saved'));
        setTimeout(() => setFenceSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || t('failed_create_staff'));
    }
  };

  if (loading) return <div className="p-8">{t('loading')}</div>;

return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-cafe-900">{t('settings_title')}</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-cafe-200">
        <h2 className="text-lg font-semibold mb-4">{t('geofence_settings_title')}</h2>
        <p className="text-sm text-cafe-600 mb-6">{t('geofence_settings_description')}</p>

        {fenceSuccess && (
          <div className="text-green-600 bg-green-50 p-3 rounded-xl mb-4">{fenceSuccess}</div>
        )}

        <form onSubmit={handleSaveFence} className="space-y-5">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={geofenceEnabled}
              onChange={(e) => setGeofenceEnabled(e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <span className="text-sm font-medium text-cafe-700">
              {t('geofence_enabled_label')}
            </span>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-cafe-700 mb-2">
                {t('geofence_lat_label')}
              </label>
              <input
                type="number"
                step="any"
                min="-90"
                max="90"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="9.0192"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-cafe-700 mb-2">
                {t('geofence_lon_label')}
              </label>
              <input
                type="number"
                step="any"
                min="-180"
                max="180"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                placeholder="38.7525"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-cafe-700 mb-2">
              {t('geofence_radius_label')}
            </label>
            <input
              type="number"
              step="any"
              min="1"
              max="10000"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className={inputClass}
            />
            <p className="text-xs text-cafe-500 mt-2">{t('geofence_radius_hint')}</p>
          </div>
<button
            type="submit"
            className="bg-cafe-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-cafe-900 transition h-12"
          >
            {t('confirm')}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-cafe-200">
        <h2 className="text-lg font-semibold mb-4">{t('access_pin_title')}</h2>
        <p className="text-sm text-cafe-600 mb-6">{t('access_pin_description')}</p>

        {pinSuccess && (
          <div className="text-green-600 bg-green-50 p-3 rounded-xl mb-4">{pinSuccess}</div>
        )}

        <form onSubmit={handleSavePin} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-cafe-700 mb-2">
              {t('current_pin')}
            </label>
            <input
              type="text"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-lg font-bold tracking-widest text-center"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-cafe-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-cafe-900 transition h-12"
          >
            {t('save_pin')}
          </button>
        </form>
      </div>
    </div>
  );
};
export default SettingsPage;

