import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle2, KeyRound, Mail } from "lucide-react";
import { forgotPasswordApi } from "../../api/authApi";

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendLink = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await forgotPasswordApi(email);
      setMessage(response.message);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          t("send_reset_failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cafe-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative border border-cafe-700">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-cafe-700 text-amber-300 flex items-center justify-center mx-auto shadow-md">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-cafe-900 tracking-tight">
            {t("reset_password")}
          </h1>
          <p className="text-xs text-cafe-500 font-medium">
            {t("reset_password_help")}
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

        <form onSubmit={handleSendLink} autoComplete="off" className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1.5">
              {t("email")}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cafe-800 hover:bg-cafe-900 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{t("send_reset_link")}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <Link
          to="/admin/login"
          className="block text-center text-xs font-bold text-cafe-600 hover:text-cafe-900"
        >
          {t("back_to_sign_in")}
        </Link>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
