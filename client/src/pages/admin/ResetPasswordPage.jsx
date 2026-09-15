import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { resetPasswordApi } from "../../api/authApi";

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hasToken = Boolean(token);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => navigate("/admin/login"), 2500);
    return () => clearTimeout(timer);
  }, [message, navigate]);

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (!hasToken) {
      setError("This password reset link is invalid.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await resetPasswordApi(token, password);
      setMessage(response.message);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to reset your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cafe-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative border border-cafe-700">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-cafe-700 text-amber-300 flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-cafe-900 tracking-tight">
            Create new password
          </h1>
          <p className="text-xs text-cafe-500 font-medium">
            {hasToken
              ? "Enter your new secure password below."
              : "This reset link is missing or incomplete."}
          </p>
        </div>

        {message && (
          <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl font-medium text-center border border-emerald-200 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {message}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium text-center border border-red-200">
            {error}
          </div>
        )}

        {!hasToken && !error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium text-center border border-red-200">
            This password reset link is invalid. Request a new one from the sign-in page.
          </div>
        )}

        {hasToken && !message && (
        <form onSubmit={handleResetPassword} autoComplete="off" className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1.5">
              New password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-cafe-400 absolute left-3.5 top-3" />
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength="8"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cafe-200 text-sm focus:border-cafe-600 focus:outline-none font-medium bg-white text-cafe-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1.5">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-cafe-400 absolute left-3.5 top-3" />
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                minLength="8"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cafe-200 text-sm focus:border-cafe-600 focus:outline-none font-medium bg-white text-cafe-900"
                required
              />
            </div>
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
                <span>Reset password</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
        )}

        <Link
          to="/admin/login"
          className="block text-center text-xs font-bold text-cafe-600 hover:text-cafe-900"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
