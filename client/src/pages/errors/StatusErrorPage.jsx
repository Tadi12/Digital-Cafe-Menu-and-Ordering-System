import React from "react";
import { Link, useNavigate } from "react-router-dom";
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
    title: "We couldn't process that request",
    message: "Please check the information provided and try again.",
    Icon: AlertTriangle,
  },
  unauthorized: {
    title: "Sign-in required",
    message: "Your session has expired or you do not have access to this page.",
    Icon: ShieldAlert,
  },
  forbidden: {
    title: "Access not available",
    message: "You don't have permission to view this page or resource.",
    Icon: ShieldAlert,
  },
  notFound: {
    title: "Page or order not found",
    message: "It may have been removed, or the link may be incorrect.",
    Icon: FileQuestion,
  },
  unavailable: {
    title: "Service temporarily unavailable",
    message: "We couldn't reach the cafe service. Please check your connection and try again.",
    Icon: WifiOff,
  },
  server: {
    title: "Something went wrong on our side",
    message: "The cafe service had a problem. Please try again in a moment.",
    Icon: ServerCrash,
  },
  unexpected: {
    title: "Something went wrong",
    message: "The page ran into an unexpected problem. You can safely try again.",
    Icon: AlertTriangle,
  },
};

const StatusErrorPage = ({ type = "unexpected", onRetry }) => {
  const navigate = useNavigate();
  const { title, message, Icon } = pageDetails[type] || pageDetails.unexpected;

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
        <h1 className="text-xl font-black text-cafe-900">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-cafe-600">{message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-2 rounded-xl bg-cafe-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cafe-900"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-2 rounded-xl border border-cafe-200 px-4 py-2.5 text-sm font-bold text-cafe-800 transition hover:bg-cafe-50"
          >
            <Home className="h-4 w-4" /> Home
          </Link>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 text-xs font-bold text-cafe-500 hover:text-cafe-800"
        >
          Go back
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
