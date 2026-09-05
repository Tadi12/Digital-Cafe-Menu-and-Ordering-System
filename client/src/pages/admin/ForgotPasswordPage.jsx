import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { forgotPasswordApi } from '../../api/authApi';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await forgotPasswordApi(email);
      setMessage(response.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send a reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cafe-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-cafe-700 text-amber-300 flex items-center justify-center mx-auto"><Mail className="w-7 h-7" /></div>
          <h1 className="text-xl font-black text-cafe-900">Reset your password</h1>
          <p className="text-xs text-cafe-500">Enter your admin email and we’ll send a secure reset link.</p>
        </div>
        {message && <p className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium">{message}</p>}
        {error && <p className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium">{error}</p>}
        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          <input type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required className="w-full px-4 py-3 rounded-xl border border-cafe-200 text-sm focus:border-cafe-600 focus:outline-none" />
          <button disabled={loading} className="w-full bg-cafe-800 hover:bg-cafe-900 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50">{loading ? 'Sending…' : 'Send reset link'}</button>
        </form>
        <Link to="/admin/login" className="block text-center text-xs font-bold text-cafe-600 hover:text-cafe-900">Back to sign in</Link>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
