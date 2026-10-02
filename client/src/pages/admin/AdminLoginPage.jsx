import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import LabelInput from '../../components/common/LabelInput';
import { ArrowRight } from 'lucide-react';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const res = await login({ email, password });
    setLoading(false);

    if (res.success) {
      navigate('/admin/dashboard');
    } else {
      setErrorMsg(res.message || t('invalid_credentials'));
    }
  };

  return (
    <div className="min-h-screen bg-cafe-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Top right language switcher */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative border border-cafe-700">
        {/* Header */}
        <div className="text-center space-y-2">
          <img
            src="/logo.png"
            alt={t('app_name')}
            className="mx-auto h-14 w-14 rounded-full object-cover shadow-md"
          />
          <h1 className="font-display text-xl font-black text-cafe-900 tracking-tight">
            {t('admin_login_title')}
          </h1>
          <p className="text-xs text-cafe-500 font-medium">
            {t('admin_work')}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium text-center border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          {/* The Bencho label input: the label acts as its own placeholder
              until you focus it, then lifts to the top edge and the outline
              opens a gap beneath it. Both stay controlled, so the submit
              handler above still reads `email` / `password` unchanged. */}
          <LabelInput
            field="Email"
            label={t('email')}
            name="email"
            value={email}
            onChange={setEmail}
            autoComplete="username"
            required
          />

          <LabelInput
            field="Password"
            label={t('password')}
            name="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
          />
          <div className="text-right -mt-1">
            <Link to="/admin/forgot-password" className="text-xs font-bold text-cafe-600 hover:text-cafe-900">
              {t('forgot_password')}
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cafe-800 hover:bg-cafe-900 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{t('login')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;
