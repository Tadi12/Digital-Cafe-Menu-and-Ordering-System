import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw, WifiOff } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import LoadingSpinner from "../common/LoadingSpinner";

const WIFI_MESSAGE =
  "Please connect to the cafe’s Wi-Fi to access the menu and place an order.";

const CustomerAccessGate = ({ children }) => {
  const [state, setState] = useState("checking");

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
    checkAccess();
  }, [checkAccess]);

  if (state === "allowed") return children;

  if (state === "checking") {
    return (
      <div className="min-h-screen bg-cafe-50 flex flex-col justify-center">
        <LoadingSpinner message="Checking menu access..." />
      </div>
    );
  }

  const denied = state === "denied";
  return (
    <div className="min-h-screen bg-cafe-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-sm rounded-2xl border border-cafe-200 bg-white p-6 shadow-sm">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${denied ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
          {denied ? <WifiOff className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
        </div>
        <h1 className="font-display text-xl font-bold text-cafe-900">
          {denied ? "Cafe Wi-Fi required" : "Menu temporarily unavailable"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-cafe-600">
          {denied
            ? WIFI_MESSAGE
            : "We couldn’t reach the cafe menu right now. Check your connection and try again."}
        </p>
        {!denied && (
          <button
            type="button"
            onClick={checkAccess}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cafe-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cafe-900"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        )}
      </div>
    </div>
  );
};

export default CustomerAccessGate;
