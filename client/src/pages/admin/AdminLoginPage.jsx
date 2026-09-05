import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import { Coffee, Lock, Mail, ArrowRight } from 'lucide-react';

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
      setErrorMsg(res.message || 'Invalid credentials');
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
          <div className="w-14 h-14 rounded-2xl bg-cafe-700 text-amber-300 flex items-center justify-center mx-auto shadow-md">
            <Coffee className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-cafe-900 tracking-tight">
            {t('admin_login_title')}
          </h1>
          <p className="text-xs text-cafe-500 font-medium">
            Sign in to manage café orders & digital menu
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium text-center border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1.5">
              {t('email')}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-cafe-400 absolute left-3.5 top-3" />
              <input
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cafe.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cafe-200 text-sm focus:border-cafe-600 focus:outline-none font-medium bg-white text-cafe-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1.5">
              {t('password')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-cafe-400 absolute left-3.5 top-3" />
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cafe-200 text-sm focus:border-cafe-600 focus:outline-none font-medium bg-white text-cafe-900"
                required
              />
            </div>
          </div>

          <div className="text-right -mt-1">
            <Link to="/admin/forgot-password" className="text-xs font-bold text-cafe-600 hover:text-cafe-900">
              Forgot password?
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
