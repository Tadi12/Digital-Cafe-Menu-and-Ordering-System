import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import LabelInput from '../components/common/LabelInput';
import { staffHomePath } from '../utils/staffRoles';
import { ArrowRight } from 'lucide-react';

/**
 * THE staff sign-in page. One page, every role.
 *
 * There is deliberately no role selector here. A role is a property of the account
 * the server returns once it has verified the credentials — taking one from the form
 * would mean the browser was asserting an identity the backend never checked, and
 * the route guards would then be defending against a value the user chose for
 * themselves. The password decides the role, not the other way round.
 *
 * Where each role lands afterwards is decided by staffHomePath(), the one place that
 * maps a role to its dashboard, so the destination cannot drift out of step with the
 * guards protecting it. It used to be /admin/login, which made this page look like
 * part of the admin area and invited a second login per station.
 */
const LoginPage = () => {
  const navigate = useNavigate();
  const { login, admin, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Somebody already signed in has no business on the sign-in form. Send them
  // where they belong instead of letting them authenticate a second time on top of
  // the session they already hold. Guarded on authLoading so a refresh does not
  // flash the form before the stored session has been checked.
  if (authLoading) return null;
  if (admin) return <Navigate to={staffHomePath(admin.role)} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const res = await login({ email, password });
    setLoading(false);

    if (res.success) {
      // The role comes from the authenticated account in the login response, never
      // from the form. Send each role to the screen it actually owns: without this
      // a chef or a barista would land on /admin/dashboard, be bounced by
      // ProtectedRoute, and only reach their own screen after a visible redirect.
      navigate(staffHomePath(res.data?.role), { replace: true });
    } else {
      setErrorMsg(res.message || t('invalid_credentials'));
    }
  };

  return (
    <div className="min-h-screen bg-cafe-900 dark:bg-cafe-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Top right language switcher */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm bg-white dark:bg-cafe-900 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative border border-cafe-700 dark:border-cafe-800">
        {/* Header */}
        <div className="text-center space-y-2">
          <img
            src="/logo.png"
            alt={t('app_name')}
            className="mx-auto h-14 w-14 rounded-full object-cover shadow-md"
          />
          <h1 className="font-display text-xl font-black text-cafe-900 dark:text-white tracking-tight">
            {t('staff_login_title')}
          </h1>
          <p className="text-xs text-cafe-500 dark:text-cafe-400 font-medium">
            {t('staff_login_subtitle')}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-xl font-medium text-center border border-red-200 dark:border-red-800/30">
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
            <Link to="/forgot-password" className="text-xs font-bold text-cafe-600 dark:text-cafe-400 hover:text-cafe-900 dark:hover:text-white transition-colors">
              {t('forgot_password')}
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cafe-800 dark:bg-cafe-700 hover:bg-cafe-900 dark:hover:bg-cafe-600 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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

export default LoginPage;
