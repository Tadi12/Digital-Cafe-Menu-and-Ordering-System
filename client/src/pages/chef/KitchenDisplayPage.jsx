import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSocket } from "../../hooks/useSocket";
import { getOrdersApi } from "../../api/orderApi";
import { useOrderStatusActions } from "../../hooks/useOrderStatusActions";
import OrderStatusActionButton from "../../components/common/OrderStatusActionButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { Flame, Clock, CheckCircle } from "lucide-react";

// Helper component for an individual order ticket.
// The action button is shared with the admin order cards so the kitchen gets the
// same loading copy, disabled-while-busy behaviour and duplicate-click guard.
const OrderTicket = ({ order, onStatusChange, pendingTarget, succeededStatus }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-recipe-card border border-cafe-200 dark:border-recipe-border rounded-xl shadow-sm p-4 flex flex-col h-full">
      <div className="flex justify-between items-start mb-3 border-b border-cafe-100 dark:border-recipe-divider pb-3">
        <div>
          <span className="text-xs font-bold text-cafe-500 uppercase tracking-widest block mb-1">
            {t('table_number_label', { number: order.tableNumberSnapshot || '?' })}
          </span>
          <span className="font-display font-bold text-lg text-cafe-900 dark:text-recipe-text">
            {order.orderNumber || order._id.slice(-6)}
          </span>
        </div>
        <div className="text-xs font-mono text-cafe-500 bg-cafe-100 dark:bg-recipe-cardHover px-2 py-1 rounded">
          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      
      <ul className="flex-1 space-y-3 mb-2">
        {order.items.map((item, index) => (
          <li key={index} className="flex gap-3 text-sm">
            <span className="font-bold text-cafe-900 dark:text-recipe-text">{item.quantity}x</span>
            <div className="flex-1">
              <span className="font-semibold text-cafe-800 dark:text-recipe-text">{item.menuItem?.name || t('unknown_item')}</span>
              {item.notes && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 bg-red-50 dark:bg-red-500/10 p-1 rounded font-medium">
                  {t('note_label')}: {item.notes}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      
      <div className="mt-4">
        <OrderStatusActionButton
          order={order}
          role="chef"
          onUpdate={onStatusChange}
          pendingTarget={pendingTarget}
          succeededStatus={succeededStatus}
          buttonClassName="py-3 text-sm"
        />
      </div>
    </div>
  );
};

const KitchenDisplayPage = () => {
  const { t } = useTranslation();
  const { socket, joinAdminRoom, playNotificationSound } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const response = await getOrdersApi();
      if (response?.success) {
        // Sort oldest first for the kitchen
        const sorted = response.data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        setOrders(sorted);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    joinAdminRoom();

    const handleNewOrder = (newOrder) => {
      setOrders((prev) => [...prev, newOrder].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
      if (playNotificationSound) playNotificationSound();
    };

    const handleOrderUpdated = (updatedOrder) => {
      setOrders((prev) => prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)));
    };

    const handleOrderCancelled = (cancelledOrder) => {
      setOrders((prev) => prev.filter((o) => o._id !== cancelledOrder._id));
    };

    if (socket) {
      socket.on("new_order", handleNewOrder);
      socket.on("order_updated", handleOrderUpdated);
      socket.on("order_cancelled", handleOrderCancelled);
    }

    return () => {
      if (socket) {
        socket.off("new_order", handleNewOrder);
        socket.off("order_updated", handleOrderUpdated);
        socket.off("order_cancelled", handleOrderCancelled);
      }
    };
  }, [socket]);

  const applyUpdatedOrder = useCallback((updatedOrder) => {
    setOrders((prev) => prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)));
  }, []);

  // Shared hook: per-order loading/success state plus the duplicate-click lock.
  // This also sends the { status } body the endpoint's schema requires.
  const { updateStatus, succeededStatus, pendingTarget } = useOrderStatusActions(applyUpdatedOrder);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner message={t('loading_order_stream')} />
      </div>
    );
  }

  // Filter columns
  const pendingOrders = orders.filter(o => o.status === 'Pending');
  const preparingOrders = orders.filter(o => o.status === 'Preparing');
  const readyOrders = orders.filter(o => o.status === 'Ready');

  return (
    <div className="flex flex-1 gap-6 h-full min-h-[80vh]">
      {/* Column 1: Pending */}
      <div className="flex-1 flex flex-col bg-cafe-100/50 dark:bg-recipe-cardHover/50 rounded-2xl border border-cafe-200 dark:border-recipe-border overflow-hidden">
        <div className="bg-cafe-800 text-white p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 font-bold">
            <Clock className="w-5 h-5" />
            <span>{t('kitchen_col_pending')}</span>
          </div>
          <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-sm">{pendingOrders.length}</span>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
          {pendingOrders.map(order => (
            <OrderTicket key={order._id} order={order} onStatusChange={updateStatus} pendingTarget={pendingTarget(order._id)} succeededStatus={succeededStatus[order._id]} />
          ))}
          {pendingOrders.length === 0 && (
            <div className="text-center text-cafe-500 py-10 text-sm font-medium">{t('kitchen_no_pending')}</div>
          )}
        </div>
      </div>

      {/* Column 2: Preparing */}
      <div className="flex-1 flex flex-col bg-cafe-100/50 dark:bg-recipe-cardHover/50 rounded-2xl border border-blue-200 dark:border-blue-900 overflow-hidden">
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 font-bold">
            <Flame className="w-5 h-5" />
            <span>{t('kitchen_col_preparing')}</span>
          </div>
          <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-sm">{preparingOrders.length}</span>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
          {preparingOrders.map(order => (
            <OrderTicket key={order._id} order={order} onStatusChange={updateStatus} pendingTarget={pendingTarget(order._id)} succeededStatus={succeededStatus[order._id]} />
          ))}
          {preparingOrders.length === 0 && (
            <div className="text-center text-blue-500/70 py-10 text-sm font-medium">{t('kitchen_no_preparing')}</div>
          )}
        </div>
      </div>

      {/* Column 3: Ready */}
      <div className="flex-1 flex flex-col bg-cafe-100/50 dark:bg-recipe-cardHover/50 rounded-2xl border border-emerald-200 dark:border-emerald-900 overflow-hidden">
        <div className="bg-emerald-600 text-white p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle className="w-5 h-5" />
            <span>{t('kitchen_col_ready')}</span>
          </div>
          <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-sm">{readyOrders.length}</span>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar opacity-75">
          {readyOrders.map(order => (
            <div key={order._id} className="bg-white dark:bg-recipe-card border border-emerald-200 dark:border-emerald-900 rounded-xl p-4">
               <div className="flex justify-between items-center">
                 <span className="font-bold text-lg text-emerald-700 dark:text-emerald-400">{t('table_number_label', { number: order.tableNumberSnapshot || '?' })}</span>
                 <span className="text-xs font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">
                   {order.orderNumber || order._id.slice(-6)}
                 </span>
               </div>
               <p className="text-xs mt-2 text-cafe-500">{t('kitchen_waiting_waiter')}</p>
            </div>
          ))}
          {readyOrders.length === 0 && (
            <div className="text-center text-emerald-500/70 py-10 text-sm font-medium">{t('kitchen_no_ready')}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KitchenDisplayPage;
