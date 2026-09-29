import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, RefreshCw, WifiOff, MapPinOff } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import LoadingSpinner from "../common/LoadingSpinner";
import { useLocationGuard } from "../../hooks/useLocationGuard";

const CustomerAccessGate = ({ children }) => {
  const { t } = useTranslation();
  const [state, setState] = useState("checking");
  const { locationStatus, errorMsg } = useLocationGuard();

  const checkAccess = useCallback(async () => {
    setState("checking");
    try {
      await axiosClient.get("/access/menu");
      setState("allowed");
    } catch (error) {
      setState(error.response?.status === 403 ? "denied" : "unavailable");
    }
  }, []);

  useEffect(() => {
    // Only check backend access after location is granted so headers are attached
    if (locationStatus === "granted") {
      checkAccess();
    }
  }, [checkAccess, locationStatus]);

  if (state === "allowed") return children;

  if (locationStatus === "checking" || state === "checking") {
    return (
      <div className="min-h-screen bg-cafe-50 flex flex-col justify-center">
        <LoadingSpinner message={locationStatus === "checking" ? "Checking location..." : t("checking_menu_access")} />
      </div>
    );
  }

  if (locationStatus === "denied") {
    return (
      <div className="min-h-screen bg-cafe-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-sm rounded-2xl border border-cafe-200 bg-white p-6 shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
            <MapPinOff className="h-8 w-8" />
          </div>
          <h1 className="font-display text-xl font-bold text-cafe-900">
            Location Required
          </h1>
          <p className="mt-3 text-sm leading-6 text-cafe-600">
            {errorMsg}
          </p>
        </div>
      </div>
    );
  }

  const denied = state === "denied";
  return (
    <div className="min-h-screen bg-cafe-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-sm rounded-2xl border border-cafe-200 bg-white p-6 shadow-sm">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${denied ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
          {denied ? <MapPinOff className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
        </div>
        <h1 className="font-display text-xl font-bold text-cafe-900">
          {denied ? "Outside Cafe Range" : t("menu_unavailable_title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-cafe-600">
          {denied
            ? "You appear to be outside the cafe's ordering radius. Please move closer to the cafe to order."
            : t("menu_unavailable_message")}
        </p>
        {!denied && (
          <button
            type="button"
            onClick={checkAccess}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cafe-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cafe-900"
          >
            <RefreshCw className="h-4 w-4" />
            {t("try_again")}
          </button>
        )}
      </div>
    </div>
  );
};

export default CustomerAccessGate;
