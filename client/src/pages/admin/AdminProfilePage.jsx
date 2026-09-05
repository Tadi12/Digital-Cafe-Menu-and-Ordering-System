import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { updateAdminProfileApi } from '../../api/authApi';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const AdminProfilePage = () => {
  const { admin, refreshAdmin } = useAuth();
  const { t } = useTranslation();

  const [name, setName] = useState(admin?.name || '');
  const [email, setEmail] = useState(admin?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error(t('invalid_email'));
      return false;
    }
    if (password && password.length < 6) {
      toast.error(t('password_too_short'));
      return false;
    }
    if (password !== confirmPassword) {
      toast.error(t('passwords_do_not_match'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { name, email };
      if (password) payload.password = password;
      const res = await updateAdminProfileApi(payload);
      if (res.success) {
        toast.success(t('profile_updated'));
        await refreshAdmin();
      } else {
        toast.error(res.message || t('update_failed'));
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || t('update_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">{t('admin_profile')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="name">{t('name')}</label>
          <input
            id="name"
            type="text"
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">{t('email')}</label>
          <input
            id="email"
            type="email"
            className="w-full border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">{t('new_password')}</label>
          <input
            id="password"
            type="password"
            className="w-full border rounded px-3 py-2"
            placeholder={t('leave_blank_to_keep_current')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="confirmPassword">{t('confirm_password')}</label>
          <input
            id="confirmPassword"
            type="password"
            className="w-full border rounded px-3 py-2"
            placeholder={t('leave_blank_to_keep_current')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-cafe-600 text-white px-4 py-2 rounded hover:bg-cafe-700 disabled:opacity-50"
        >
          {loading ? t('updating') : t('save_changes')}
        </button>
      </form>
    </div>
  );
};

export default AdminProfilePage;
