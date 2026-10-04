import { resolveApiError } from '../../utils/apiError';
import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageContext } from "../../context/LanguageContext";
import { useSocket } from "../../hooks/useSocket";
import { getOrderByIdApi, cancelOrderApi } from "../../api/orderApi";
import Header from "../../components/common/Header";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ConfirmModal from "../../components/common/ConfirmModal";
import OrderStatusBadge from "../../components/customer/OrderStatusBadge";
import ActionButton from "../../components/common/ActionButton";
import { formatCurrency } from "../../utils/currencyFormatter";
import { preparationStatusLabel } from "../../utils/orderStatus";
import StatusErrorPage, { getErrorPageType } from "../errors/StatusErrorPage";
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
  const [pageErrorType, setPageErrorType] = useState("");
  const [readyToastVisible, setReadyToastVisible] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await getOrderByIdApi(orderId);
        if (res.success) {
          setOrder(res.data);
        } else {
          setPageErrorType("notFound");
        }
      } catch (err) {
        console.error("[Tracker Fetch Error]:", err);
        setPageErrorType(getErrorPageType(err));
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
        if (updatedOrder?._id === orderId) {
          // A socket event can be a smaller document than the initial API response.
          // Preserve existing fields so a status notification cannot break the view.
          setOrder((currentOrder) => ({
            ...currentOrder,
            ...updatedOrder,
            items: Array.isArray(updatedOrder.items)
              ? updatedOrder.items
              : currentOrder?.items || [],
          }));
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
        const readyMessage = t('order_ready_notif_body', { number: order.orderNumber });
        markReadyOrderNotified(order._id);
        setReadyToastVisible(true);
        previousReadyStatusRef.current = true;
        playNotificationSound("customer");

        if ("Notification" in window) {
          try {
          if (Notification.permission === "granted") {
            new Notification(t('order_ready_notif_title'), {
              body: readyMessage,
              tag: `order-ready-${order._id}`,
              icon: "/notification-icon.png",
            });
          } else if (Notification.permission === "default") {
            Notification.requestPermission()
              .then((permission) => {
                if (permission === "granted") {
                  new Notification(t('order_ready_notif_title'), {
                    body: readyMessage,
                    tag: `order-ready-${order._id}`,
                    icon: "/notification-icon.png",
                  });
                }
              })
              .catch((notificationError) => {
                console.warn("[Ready Notification Error]:", notificationError);
              });
          }
          } catch (notificationError) {
            console.warn("[Ready Notification Error]:", notificationError);
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



  if (loading) {
    return (
      <div className="min-h-screen bg-cafe-50 flex flex-col justify-center">
        <LoadingSpinner message={t('loading_order_status')} />
      </div>
    );
  }

  if (!order) {
    return <StatusErrorPage type={pageErrorType || "notFound"} />;
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

  // Re-key the progress row on the status so React remounts it and the
  // fade/slide transition replays on every change. Without this the tracker
  // swapped steps instantly, which read as a frozen page when a socket update
  // arrived while the customer was looking at it.
  const statusRevision = `${order._id}:${order.status}`;
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

      <div className="flex-1 p-5 pb-28 space-y-6">
        {readyToastVisible && (
          <div className="fixed inset-x-4 top-24 z-50 mx-auto max-w-sm rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl ring-4 ring-emerald-500/10 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-extrabold text-emerald-800">
                  {t('order_ready_notif_title')}!
                </h3>
                <p className="mt-1 text-xs font-medium text-cafe-600 leading-relaxed">
                  {t('order_ready_bring_here')}
                </p>
                <div className="mt-3 inline-block rounded-lg bg-cafe-50 px-3 py-1.5 border border-cafe-100">
                  <p className="text-xs font-bold text-cafe-800">
                    Order <span className="text-cafe-900 font-black">{order.orderNumber}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissReadyToast}
                aria-label={t('close_notification')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cafe-50 text-cafe-400 hover:bg-cafe-100 hover:text-cafe-700 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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
              <h3 className="font-display text-base font-semibold text-cafe-800 text-center">
              {t("live_tracking_title")}
            </h3>

            <div key={statusRevision} className="relative flex items-center justify-between px-2 animate-fadeIn">
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
            <h3 className="font-bold text-base">{t('order_cancelled_title')}</h3>
            <p className="text-xs">
              {t('order_cancelled_message')}
            </p>
          </div>
        )}

        {/* Error message alert */}
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium text-center border border-red-200">
            {errorMsg}
          </div>
        )}

        {/* Per-station progress. The customer still sees ONE order with ONE
            overall status above; this only explains which half is still being
            prepared when the two halves move at different speeds. A half with no
            items in this order is hidden rather than shown as an empty row. */}
        {!isCancelled && (order.foodStatus !== 'not_required' || order.drinkStatus !== 'not_required') && (
          <div className="bg-white rounded-2xl p-5 border border-cafe-200 shadow-sm space-y-2">
            <h4 className="text-xs font-bold text-cafe-800 uppercase tracking-wider">
              {t('preparation_progress_title')}
            </h4>
            {order.foodStatus !== 'not_required' && (
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-cafe-700">{t('food_section_label')}</span>
                <span className="text-cafe-900">{preparationStatusLabel(order.foodStatus, t)}</span>
              </div>
            )}
            {order.drinkStatus !== 'not_required' && (
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-cafe-700">{t('drink_section_label')}</span>
                <span className="text-cafe-900">{preparationStatusLabel(order.drinkStatus, t)}</span>
              </div>
            )}
          </div>
        )}

        {/* Ordered Items Summary */}
        <div className="bg-white rounded-2xl p-5 border border-cafe-200 shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-cafe-800 uppercase tracking-wider">
            {t('items_in_order')}
          </h4>
          <div className="space-y-2">
            {(Array.isArray(order.items) ? order.items : []).map((item, idx) => {
              const name = item.foodName?.[currentLang] || item.foodName?.en || t('food');
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
              <ActionButton
                onClick={() => setIsCancelModalOpen(true)}
                loading={cancelling}
                loadingText={t("cancelling_order")}
                icon={Ban}
                className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-3 px-4 rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {t("cancel_order")}
              </ActionButton>
            ) : (
              <p className="text-center text-xs font-semibold text-cafe-500 bg-cafe-100 p-3 rounded-xl">
                {t("cannot_cancel_notice")}
              </p>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={() => {
          setCancelling(true);
          setErrorMsg("");
          cancelOrderApi(orderId)
            .then(res => {
              if (res.success) setOrder(res.data);
            })
            .catch(err => {
              setErrorMsg(resolveApiError(err, t, "failed_cancel_order"));
            })
            .finally(() => setCancelling(false));
        }}
        title={t("cancel_order", "Cancel Order")}
        message={t("cancel_order_confirm", "Are you sure you want to cancel this order? This action cannot be undone.")}
        confirmText={t("cancel_order", "Cancel Order")}
        isDestructive={true}
      />
    </div>
  );
};

export default OrderTrackerPage;

