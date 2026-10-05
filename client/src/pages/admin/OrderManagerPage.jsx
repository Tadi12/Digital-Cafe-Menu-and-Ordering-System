import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSocket } from "../../hooks/useSocket";
import { useAuth } from "../../hooks/useAuth";
import { useSoundEnabled } from "../../hooks/useSoundEnabled";
import { getOrdersApi } from "../../api/orderApi";
import { useOrderStatusActions, usePreparationStatusActions } from "../../hooks/useOrderStatusActions";
import OrderCard from "../../components/admin/OrderCard";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { Search, Volume2, VolumeX, Bell, CheckCircle, Hand } from "lucide-react";
import { orderStatusLabel } from '../../utils/orderStatus';
import { isFloorStaffRole, isStationRole } from '../../utils/staffRoles';

const ALERT_VISIBLE_MS = 6000;

/**
 * Banner styling per event.
 *
 * The sound for the waiter events is played by AdminNavbar, which is mounted on
 * every staff page — the waiter lands on the dashboard, not here — so this
 * screen only shows the visual banner. Playing here as well would double up.
 */
const ALERT_TONES = {
  new: { bar: 'bg-amber-500 hover:bg-amber-600', Icon: Bell },
  ready: { bar: 'bg-emerald-600 hover:bg-emerald-700', Icon: CheckCircle },
  called: { bar: 'bg-rose-600 hover:bg-rose-700', Icon: Hand },
};

const orderLabel = (order) =>
  order?.orderNumber || order?._id?.slice(-6) || '';

const OrderManagerPage = () => {
  const { t } = useTranslation();
  const { admin } = useAuth();
  const { socket, joinAdminRoom, joinStationRoom, joinWaiterRoom, playEventSound } = useSocket();
  const [soundEnabled, setSoundEnabled] = useSoundEnabled();

  const [orders, setOrders] = useState([]);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: "" });
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const alertTimerRef = useRef(null);
  // Last known status per order, so an alert fires on the transition into Ready
  // rather than on every order_updated echo.
  const statusRef = useRef({});

  // The signed-in role, read once here and handed to the sound matrix so it can
  // decide which clip (if any) this device should hear.
  const role = admin?.role;

  const isFloorStaff = isFloorStaffRole(role);
  // True for a chef or a barista: the API returns only that station's items and
  // the page must therefore use the per-track status button instead of the single
  // overall-status one.
  const stationOnly = isStationRole(role);
  // A waiter only ever receives orders for the tables assigned to them; the API
  // filters them server-side, so this flag exists purely to pick the right socket
  // room and to mark the screen as table-scoped.
  const isWaiterRole = role === 'waiter';

  const fetchOrders = async () => {
    try {
      const res = await getOrdersApi({
        status: selectedStatus === "All" ? undefined : selectedStatus,
        search: searchQuery,
      });
      if (res.success) {
        setOrders(res.data);
        // Seed the cache with what the server just sent, so the first socket
        // echo is compared against reality instead of looking like a change.
        statusRef.current = Object.fromEntries(
          res.data.map((order) => [order._id, order.status]),
        );
      }
    } catch (err) {
      console.error("[Order Queue Fetch Error]:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus, searchQuery]);

  // Single banner slot: a second event replaces the first rather than stacking.
  const showAlert = useCallback((tone, message) => {
    setAlert({ tone, message });
    window.clearTimeout(alertTimerRef.current);
    alertTimerRef.current = window.setTimeout(
      () => setAlert(null),
      ALERT_VISIBLE_MS,
    );
  }, []);

  useEffect(() => () => window.clearTimeout(alertTimerRef.current), []);

  // Socket.IO Room setup & event listeners
  useEffect(() => {
    // A chef or a barista joins the room for the half of the order they prepare, so
    // the socket delivers only their items. A waiter joins the private feed scoped
    // to their own tables. Everyone else keeps the full admin feed as before.
    if (stationOnly) {
      joinStationRoom();
    } else if (isWaiterRole) {
      joinWaiterRoom();
    } else {
      joinAdminRoom();
    }

    if (socket) {
      // Guard against a stale row: an echo for an order this station has no items
      // for (or that is no longer in the current filter) is ignored rather than
      // appended as a card with nothing in it.
      const applyIncoming = (incoming) => {
        if (stationOnly && !(incoming.items || []).length) return;
        statusRef.current[incoming._id] = incoming.status;
        setOrders((prev) =>
          prev.some((ord) => ord._id === incoming._id)
            ? prev.map((ord) => (ord._id === incoming._id ? incoming : ord))
            : [incoming, ...prev],
        );
      };

      const handleNewOrder = (newOrder) => {
        applyIncoming(newOrder);
        showAlert(
          'new',
          t('new_order_placed', {
            orderNumber: orderLabel(newOrder),
            tableNumber: newOrder.tableNumberSnapshot,
          }),
        );

        // The kitchen is who acts on a new ticket, so the sound matrix sends this
        // to the chef and the barista. This handler does not decide who hears it.
        if (soundEnabled) {
          playEventSound('new_order', role);
        }
      };

      const handleOrderUpdated = (updatedOrder) => {
        const previousStatus = statusRef.current[updatedOrder._id];
        statusRef.current[updatedOrder._id] = updatedOrder.status;

        setOrders((prev) =>
          prev.map((ord) =>
            ord._id === updatedOrder._id ? updatedOrder : ord,
          ),
        );

        // Only the Preparing -> Ready crossing is a waiter job. The chef's own
        // screen is on Preparing, and a chef does not need the floor banner.
        const justBecameReady =
          updatedOrder.status === 'Ready' && previousStatus !== 'Ready';
        if (justBecameReady && isFloorStaff) {
          showAlert(
            'ready',
            t('waiter_order_ready_msg', {
              orderNumber: orderLabel(updatedOrder),
              tableNumber: updatedOrder.tableNumberSnapshot,
            }),
          );
        }
      };

      const handleOrderCancelled = (cancelledOrder) => {
        statusRef.current[cancelledOrder._id] = 'Cancelled';
        setOrders((prev) =>
          prev.map((ord) =>
            ord._id === cancelledOrder._id ? cancelledOrder : ord,
          ),
        );
      };

      const handleWaiterCalled = (data) => {
        if (!isFloorStaff) return;
        showAlert(
          'called',
          t('waiter_called_msg', { tableNumber: data?.tableNumber || '?' }),
        );
      };

      socket.on("new_order", handleNewOrder);
      socket.on("order_updated", handleOrderUpdated);
      socket.on("order_cancelled", handleOrderCancelled);
      socket.on("waiter_called", handleWaiterCalled);

      return () => {
        socket.off("new_order", handleNewOrder);
        socket.off("order_updated", handleOrderUpdated);
        socket.off("order_cancelled", handleOrderCancelled);
        socket.off("waiter_called", handleWaiterCalled);
      };
    }
  }, [socket, soundEnabled, role, isFloorStaff, stationOnly, isWaiterRole, joinAdminRoom, joinStationRoom, joinWaiterRoom, playEventSound, showAlert, t]);

  // Replace the order in place once the server has confirmed the new status.
  // Keyed by _id so several orders can be updated independently.
  const applyUpdatedOrder = useCallback((updatedOrder) => {
    setOrders((prev) =>
      prev.map((ord) => (ord._id === updatedOrder._id ? updatedOrder : ord)),
    );
  }, []);

  // Owns the per-order loading / success state and the duplicate-click lock.
  const {
    updateStatus,
    pendingStatus,
    succeededStatus,
    pendingTarget,
  } = useOrderStatusActions(applyUpdatedOrder);

  // The same guarantees, scoped to the chef's / barista's own preparation track.
  const {
    updatePreparation,
    pendingPreparation,
    succeededPreparation,
    pendingPreparationTarget,
  } = usePreparationStatusActions(applyUpdatedOrder);

  // The access-denied modal is no longer raised here — a failed status change
  // surfaces as a toast from the hook, which keeps the button usable for a retry.

  const statusTabs = [
    "All",
    "Pending",
    "Preparing",
    "Ready",
    "Completed",
    "Cancelled",
  ];

  const { bar, Icon } = ALERT_TONES[alert?.tone] || ALERT_TONES.new;

  return (
    <div className="space-y-6">
      {/* Real-time Order Alert Toast Banner */}
      {alert && (
        <div
          role="status"
          className={`${bar} text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between animate-bounce`}
        >
          <div className="flex items-center gap-2 font-bold text-xs">
            <Icon className="w-4 h-4" />
            <span>{alert.message}</span>
          </div>
          <button
            onClick={() => setAlert(null)}
            className="text-xs font-black px-2 py-0.5 rounded hover:bg-black/20"
          >
            ✕
          </button>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-cafe-200 shadow-sm">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {statusTabs.map((tab) => {
            const count =
              tab === "All"
                ? orders.length
                : orders.filter((o) => o.status === tab).length;
            const isSelected = selectedStatus === tab;

            return (
              <button
                key={tab}
                onClick={() => setSelectedStatus(tab)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-cafe-800 text-white shadow"
                    : "bg-cafe-50 text-cafe-700 hover:bg-cafe-100"
                }`}
              >
                <span>{orderStatusLabel(tab, t)}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected
                      ? "bg-cafe-600 text-white"
                      : "bg-cafe-200 text-cafe-800"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 md:w-48">
            <Search className="w-4 h-4 text-cafe-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search_orders_placeholder")}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-cafe-200 text-xs focus:border-cafe-600 focus:outline-none"
            />
          </div>

          {/* Audio Chime Sound Toggle */}
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            aria-pressed={soundEnabled}
            className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold ${
              soundEnabled
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : "bg-gray-100 text-gray-500 border-gray-300"
            }`}
            title={
              soundEnabled
                ? t("sound_alert_enabled")
                : t("sound_alert_muted")
            }
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {soundEnabled ? t("chime_on") : t("chime_muted")}
            </span>
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <LoadingSpinner message={t("loading_order_stream")} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.length === 0 ? (
            <div className="col-span-full py-16 text-center text-cafe-500 font-medium">
              {t('no_orders')}
            </div>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                onUpdateStatus={updateStatus}
                pendingTarget={pendingTarget(order._id)}
                succeededStatus={succeededStatus[order._id]}
                onUpdatePreparation={updatePreparation}
                pendingPreparationTarget={pendingPreparationTarget(order._id)}
                succeededPreparation={succeededPreparation[order._id]}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default OrderManagerPage;

