import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { resetPasswordApi } from '../../api/authApi';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true); setError('');
    try {
      const response = await resetPasswordApi(token, password);
      setMessage(response.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cafe-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center"><h1 className="text-xl font-black text-cafe-900">Choose a new password</h1><p className="text-xs text-cafe-500 mt-2">Use at least 6 characters.</p></div>
        {message && <p className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium">{message}</p>}
        {error && <p className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium">{error}</p>}
        {!message && <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" minLength="6" required className="w-full px-4 py-3 rounded-xl border border-cafe-200 text-sm focus:border-cafe-600 focus:outline-none" />
          <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" minLength="6" required className="w-full px-4 py-3 rounded-xl border border-cafe-200 text-sm focus:border-cafe-600 focus:outline-none" />
          <button disabled={loading} className="w-full bg-cafe-800 hover:bg-cafe-900 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50">{loading ? 'Resetting…' : 'Reset password'}</button>
        </form>}
        <Link to="/admin/login" className="block text-center text-xs font-bold text-cafe-600 hover:text-cafe-900">Back to sign in</Link>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
