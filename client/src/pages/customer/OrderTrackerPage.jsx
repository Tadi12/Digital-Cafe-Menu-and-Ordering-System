import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageContext } from "../../context/LanguageContext";
import { useSocket } from "../../hooks/useSocket";
import { getOrderByIdApi, cancelOrderApi } from "../../api/orderApi";
import Header from "../../components/common/Header";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import OrderStatusBadge from "../../components/customer/OrderStatusBadge";
import { formatCurrency } from "../../utils/currencyFormatter";
import {
  Clock,
  ChefHat,
  CheckCircle2,
  Check,
  ArrowLeft,
  Ban,
  Radio,
} from "lucide-react";

const OrderTrackerPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentLang } = useContext(LanguageContext);
  const { socket, joinOrderRoom, playNotificationSound } = useSocket();

  const previousReadyStatusRef = useRef(false);
  const getNotifiedReadyOrders = () => {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem("cafe_customer_ready_notifications") ||
          "[]",
      );
      return Array.isArray(saved) ? saved : [];
    } catch (err) {
      return [];
    }
  };

  const markReadyOrderNotified = (orderId) => {
    if (!orderId) return;

    try {
      const notified = new Set(getNotifiedReadyOrders());
      notified.add(orderId);
      window.localStorage.setItem(
        "cafe_customer_ready_notifications",
        JSON.stringify([...notified]),
      );
    } catch (err) {
      console.error("[Ready Notification Cache Error]:", err);
    }
  };

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [readyToastVisible, setReadyToastVisible] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await getOrderByIdApi(orderId);
        if (res.success) {
          setOrder(res.data);
        }
      } catch (err) {
        console.error("[Tracker Fetch Error]:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  // Socket.IO Subscription to real-time status updates for this order
  useEffect(() => {
    if (orderId) {
      joinOrderRoom(orderId);
    }

    if (socket) {
      const handleStatusUpdate = (updatedOrder) => {
        if (updatedOrder._id === orderId) {
          setOrder(updatedOrder);
        }
      };

      socket.on("order_status_updated", handleStatusUpdate);

      return () => {
        socket.off("order_status_updated", handleStatusUpdate);
      };
    }
  }, [socket, orderId, joinOrderRoom]);

  const dismissReadyToast = () => {
    setReadyToastVisible(false);
  };

  useEffect(() => {
    if (!order) {
      previousReadyStatusRef.current = false;
      setReadyToastVisible(false);
      return;
    }

    const isReadyNow = order.status === "Ready";
    const notifiedOrders = getNotifiedReadyOrders();

    if (isReadyNow && !previousReadyStatusRef.current) {
      if (!notifiedOrders.includes(order._id)) {
        const readyMessage = `Your order ${order.orderNumber} is ready!`;
        markReadyOrderNotified(order._id);
        setReadyToastVisible(true);
        playNotificationSound(
          import.meta.env.VITE_CUSTOMER_NOTIFICATION_SOUND_URL ||
            "/sounds/customer-notification.m4a",
        );

        if ("Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification("Your order is ready", {
              body: readyMessage,
              tag: `order-ready-${order._id}`,
              icon: "/favicon-32x32.png",
            });
          } else if (Notification.permission === "default") {
            Notification.requestPermission().then((permission) => {
              if (permission === "granted") {
                new Notification("Your order is ready", {
                  body: readyMessage,
                  tag: `order-ready-${order._id}`,
                  icon: "/favicon-32x32.png",
                });
              }
            });
          }
        }

        const timer = window.setTimeout(
          () => setReadyToastVisible(false),
          6000,
        );
        return () => window.clearTimeout(timer);
      }
    }

    previousReadyStatusRef.current = isReadyNow;
  }, [order, playNotificationSound]);

  const handleCancelOrder = async () => {
    if (!window.confirm(t("cancel_order_confirm"))) return;

    setCancelling(true);
    setErrorMsg("");
    try {
      const res = await cancelOrderApi(orderId);
      if (res.success) {
        setOrder(res.data);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to cancel order.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cafe-50 flex flex-col justify-center">
        <LoadingSpinner message="Connecting to live order status..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-cafe-50 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-semibold text-cafe-700">
          Order tracking details not found.
        </p>
      </div>
    );
  }

  const steps = [
    { key: "Pending", label: t("status_pending"), icon: Clock },
    { key: "Preparing", label: t("status_preparing"), icon: ChefHat },
    { key: "Ready", label: t("status_ready"), icon: CheckCircle2 },
    { key: "Completed", label: t("status_completed"), icon: Check },
  ];

  const currentStepIndex = steps.findIndex((step) => step.key === order.status);
  const isCancelled = order.status === "Cancelled";
  const canCancel = order.status === "Pending";
  // The API populates `table`, so it may be an object rather than an ID string.
  const tableId = order.table?._id || order.table;

  return (
    <div className="min-h-screen bg-cafe-50 max-w-md mx-auto relative shadow-xl border-x border-cafe-200 flex flex-col">
      <Header />

      <div className="p-4 bg-cafe-900 text-white flex items-center justify-between shadow-xs">
        <button
          onClick={() => navigate(`/menu/table/${tableId}`)}
          disabled={!tableId}
          className="flex items-center gap-1.5 text-xs text-cafe-200 hover:text-white font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("back_to_menu")}</span>
        </button>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>Real-time Live Tracker</span>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-6">
        {readyToastVisible && (
          <div className="fixed inset-x-4 top-24 z-50 mx-auto max-w-sm rounded-2xl border border-cafe-200 bg-cafe-900 px-4 py-3 text-sm font-bold text-white shadow-xl ring-4 ring-amber-200/40">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-cafe-900">
                  ✓
                </span>
                <span className="tracking-[0.12em] uppercase text-[10px] text-amber-200">
                  Ready
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">
                  Pickup
                </span>
                <button
                  type="button"
                  onClick={dismissReadyToast}
                  aria-label="Close notification"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs text-cafe-100 transition hover:bg-white/20"
                >
                  ×
                </button>
              </div>
            </div>
            <p className="mt-2 text-base text-white">{order.orderNumber}</p>
            <p className="mt-1 text-xs text-cafe-200">
              Your order is ready, we will bring you here.
            </p>
          </div>
        )}

        {/* Order Header Card */}
        <div className="bg-white rounded-2xl p-5 border border-cafe-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-cafe-400 font-bold uppercase tracking-wider">
                {t("order_number")}
              </span>
              <h2 className="text-lg font-black text-cafe-900">
                {order.orderNumber}
              </h2>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-cafe-100 text-xs font-bold text-cafe-700">
            <span>Customer: {order.customerName}</span>
            <span>Table #{order.tableNumberSnapshot}</span>
          </div>
        </div>

        {/* Visual Progress Steps Bar */}
        {!isCancelled ? (
          <div className="bg-white rounded-2xl p-5 border border-cafe-200 shadow-sm space-y-6">
            <h3 className="text-xs font-extrabold text-cafe-800 uppercase tracking-wider text-center">
              {t("live_tracking_title")}
            </h3>

            <div className="relative flex items-center justify-between px-2">
              {/* Connector line behind circles */}
              <div className="absolute top-5 left-8 right-8 h-1 bg-cafe-100 -z-0">
                <div
                  className="h-full bg-emerald-600 transition-all duration-500"
                  style={{
                    width: `${
                      currentStepIndex >= 0
                        ? (currentStepIndex / (steps.length - 1)) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>

              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div
                    key={step.key}
                    className="relative z-10 flex flex-col items-center"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isCurrent
                          ? "bg-emerald-600 text-white ring-4 ring-emerald-100 scale-110 shadow"
                          : isPassed
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-cafe-400 border-2 border-cafe-200"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[10px] font-bold mt-2 text-center max-w-[65px] ${
                        isCurrent
                          ? "text-emerald-700 font-black"
                          : isPassed
                            ? "text-cafe-900"
                            : "text-cafe-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center text-red-700 space-y-2">
            <Ban className="w-10 h-10 mx-auto text-red-500" />
            <h3 className="font-bold text-base">Order Has Been Cancelled</h3>
            <p className="text-xs">
              This order was cancelled and will not be prepared by the kitchen.
            </p>
          </div>
        )}

        {/* Error message alert */}
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium text-center border border-red-200">
            {errorMsg}
          </div>
        )}

        {/* Ordered Items Summary */}
        <div className="bg-white rounded-2xl p-5 border border-cafe-200 shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-cafe-800 uppercase tracking-wider">
            Items in this order
          </h4>
          <div className="space-y-2">
            {order.items.map((item, idx) => {
              const name = item.foodName[currentLang] || item.foodName.en;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-cafe-800 font-medium">
                    {item.quantity}x {name}
                  </span>
                  <span className="font-bold text-cafe-900">
                    {formatCurrency(item.price * item.quantity, currentLang)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="pt-2 border-t border-cafe-100 flex items-center justify-between text-sm">
            <span className="font-bold text-cafe-900">{t("total")}</span>
            <span className="font-black text-cafe-900">
              {formatCurrency(order.totalAmount, currentLang)}
            </span>
          </div>
        </div>

        {/* Cancel Order Section */}
        {!isCancelled && order.status !== "Completed" && (
          <div className="pt-2">
            {canCancel ? (
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-3 px-4 rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                <span>{cancelling ? "Cancelling..." : t("cancel_order")}</span>
              </button>
            ) : (
              <p className="text-center text-xs font-semibold text-cafe-500 bg-cafe-100 p-3 rounded-xl">
                {t("cannot_cancel_notice")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTrackerPage;
