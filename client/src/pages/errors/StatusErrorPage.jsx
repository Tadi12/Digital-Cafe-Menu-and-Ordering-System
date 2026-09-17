import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  FileQuestion,
  Home,
  RefreshCw,
  ServerCrash,
  ShieldAlert,
  WifiOff,
} from "lucide-react";

const pageDetails = {
  badRequest: {
    titleKey: "error_bad_request_title",
    messageKey: "error_bad_request_message",
    Icon: AlertTriangle,
  },
  unauthorized: {
    titleKey: "error_unauthorized_title",
    messageKey: "error_unauthorized_message",
    Icon: ShieldAlert,
  },
  forbidden: {
    titleKey: "error_forbidden_title",
    messageKey: "error_forbidden_message",
    Icon: ShieldAlert,
  },
  notFound: {
    titleKey: "error_not_found_title",
    messageKey: "error_not_found_message",
    Icon: FileQuestion,
  },
  unavailable: {
    titleKey: "error_unavailable_title",
    messageKey: "error_unavailable_message",
    Icon: WifiOff,
  },
  server: {
    titleKey: "error_server_title",
    messageKey: "error_server_message",
    Icon: ServerCrash,
  },
  unexpected: {
    titleKey: "error_unexpected_title",
    messageKey: "error_unexpected_message",
    Icon: AlertTriangle,
  },
};

const StatusErrorPage = ({ type = "unexpected", onRetry }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { titleKey, messageKey, Icon } = pageDetails[type] || pageDetails.unexpected;

  const retry = () => {
    if (onRetry) onRetry();
    else window.location.reload();
  };

  return (
    <main className="min-h-screen bg-cafe-50 flex items-center justify-center p-6 text-center">
      <section className="w-full max-w-md rounded-3xl border border-cafe-200 bg-white p-7 shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Icon className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-black text-cafe-900">{t(titleKey)}</h1>
        <p className="mt-3 text-sm leading-6 text-cafe-600">{t(messageKey)}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-2 rounded-xl bg-cafe-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cafe-900"
          >
            <RefreshCw className="h-4 w-4" /> {t("try_again")}
          </button>
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-2 rounded-xl border border-cafe-200 px-4 py-2.5 text-sm font-bold text-cafe-800 transition hover:bg-cafe-50"
          >
            <Home className="h-4 w-4" /> {t("home")}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 text-xs font-bold text-cafe-500 hover:text-cafe-800"
        >
          {t("go_back")}
        </button>
      </section>
    </main>
  );
};

export const getErrorPageType = (error) => {
  const status = error?.response?.status;
  if (!status) return "unavailable";
  if (status === 400) return "badRequest";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  return status >= 500 ? "server" : "unexpected";
};

export default StatusErrorPage;
