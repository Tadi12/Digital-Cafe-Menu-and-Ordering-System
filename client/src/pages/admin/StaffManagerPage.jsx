import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosClient from '../../api/axiosClient';
import { resolveApiError } from '../../utils/apiError';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ActionButton from '../../components/common/ActionButton';

const StaffManagerPage = () => {
  const [staff, setStaff] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('waiter');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const { t } = useTranslation();

  const fetchStaff = async () => {
    try {
      const res = await axiosClient.get('/auth/staff');
      if (res.data?.success) {
        setStaff(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Synchronous ref lock: `creating` is state and does not update until the
    // next render, so without this a double submit creates two staff accounts.
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);

    try {
      const res = await axiosClient.post('/auth/staff', { name, email, password, role });
      if (res.data?.success) {
        setSuccess(t('staff_created_success'));
        setName(''); setEmail(''); setPassword('');
        await fetchStaff();
      }
    } catch (err) {
      setError(resolveApiError(err, t, 'failed_create_staff'));
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

  if (loading) return <LoadingSpinner message={t('loading_staff')} />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-cafe-900">{t('staff_management')}</h1>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-cafe-200">
        <h2 className="text-lg font-semibold mb-4">{t('create_staff_account')}</h2>
        {error && <div className="text-red-500 mb-4 bg-red-50 p-3 rounded-xl text-sm">{error}</div>}
        {success && <div className="text-green-600 mb-4 bg-green-50 p-3 rounded-xl text-sm">{success}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-cafe-700 mb-1">{t('name')}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border rounded-xl px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-cafe-700 mb-1">{t('email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border rounded-xl px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-cafe-700 mb-1">{t('password')}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="w-full border rounded-xl px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-cafe-700 mb-1">{t('role')}</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="w-full border rounded-xl px-4 py-2">
                <option value="waiter">{t('role_waiter')}</option>
                <option value="chef">{t('role_chef')}</option>
                <option value="super_admin">{t('role_super_admin')}</option>
              </select>
            </div>
          </div>
          <ActionButton
            type="submit"
            loading={creating}
            loadingText={t('creating_account')}
            className="bg-cafe-800 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-cafe-900 transition"
          >
            {t('create_account')}
          </ActionButton>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-cafe-200">
        <h2 className="text-lg font-semibold mb-4">{t('current_staff')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-cafe-50 text-cafe-600">
              <tr>
                <th className="px-4 py-3 font-semibold rounded-l-xl">{t('name')}</th>
                <th className="px-4 py-3 font-semibold">{t('email')}</th>
                <th className="px-4 py-3 font-semibold rounded-r-xl">{t('role')}</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s._id} className="border-b border-cafe-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-cafe-900">{s.name}</td>
                  <td className="px-4 py-3 text-cafe-600">{s.email}</td>
                  <td className="px-4 py-3">
                    <span className="bg-cafe-100 text-cafe-800 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">{t(`role_${s.role}`, { defaultValue: s.role })}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffManagerPage;
