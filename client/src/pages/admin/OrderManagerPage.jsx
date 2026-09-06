import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../../hooks/useSocket';
import { getOrdersApi, updateOrderStatusApi } from '../../api/orderApi';
import OrderCard from '../../components/admin/OrderCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Search, Volume2, VolumeX, Bell } from 'lucide-react';

const OrderManagerPage = () => {
  const { t } = useTranslation();
  const { socket, joinAdminRoom, playNotificationSound } = useSocket();

  const [orders, setOrders] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await getOrdersApi({
        status: selectedStatus === 'All' ? undefined : selectedStatus,
        search: searchQuery,
      });
      if (res.success) setOrders(res.data);
    } catch (err) {
      console.error('[Order Queue Fetch Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus, searchQuery]);

  // Socket.IO Room setup & event listeners
  useEffect(() => {
    joinAdminRoom();

    if (socket) {
      const handleNewOrder = (newOrder) => {
        setOrders((prev) => [newOrder, ...prev]);
        setNewOrderAlert(`New Order #${newOrder.orderNumber} placed from Table #${newOrder.tableNumberSnapshot}!`);

        if (soundEnabled) {
          playNotificationSound(import.meta.env.VITE_NOTIFICATION_SOUND_URL);
        }

        setTimeout(() => setNewOrderAlert(null), 5000);
      };

      const handleOrderUpdated = (updatedOrder) => {
        setOrders((prev) =>
          prev.map((ord) => (ord._id === updatedOrder._id ? updatedOrder : ord))
        );
      };

      const handleOrderCancelled = (cancelledOrder) => {
        setOrders((prev) =>
          prev.map((ord) => (ord._id === cancelledOrder._id ? cancelledOrder : ord))
        );
      };

      socket.on('new_order', handleNewOrder);
      socket.on('order_updated', handleOrderUpdated);
      socket.on('order_cancelled', handleOrderCancelled);

      return () => {
        socket.off('new_order', handleNewOrder);
        socket.off('order_updated', handleOrderUpdated);
        socket.off('order_cancelled', handleOrderCancelled);
      };
    }
  }, [socket, soundEnabled, joinAdminRoom, playNotificationSound]);

  const handleUpdateStatus = async (id, nextStatus) => {
    try {
      const res = await updateOrderStatusApi(id, { status: nextStatus });
      if (res.success) {
        setOrders((prev) =>
          prev.map((ord) => (ord._id === id ? res.data : ord))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update order status.');
    }
  };

  const statusTabs = ['All', 'Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'];

  return (
    <div className="space-y-6">
      {/* Real-time Order Alert Toast Banner */}
      {newOrderAlert && (
        <div className="bg-amber-500 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2 font-bold text-xs">
            <Bell className="w-4 h-4 animate-spin" />
            <span>{newOrderAlert}</span>
          </div>
          <button
            onClick={() => setNewOrderAlert(null)}
            className="text-xs font-black px-2 py-0.5 rounded hover:bg-amber-600"
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
              tab === 'All'
                ? orders.length
                : orders.filter((o) => o.status === tab).length;
            const isSelected = selectedStatus === tab;

            return (
              <button
                key={tab}
                onClick={() => setSelectedStatus(tab)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cafe-800 text-white shadow'
                    : 'bg-cafe-50 text-cafe-700 hover:bg-cafe-100'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected ? 'bg-cafe-600 text-white' : 'bg-cafe-200 text-cafe-800'
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
              placeholder="Search order # or name..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-cafe-200 text-xs focus:border-cafe-600 focus:outline-none"
            />
          </div>

          {/* Audio Chime Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}
            title={soundEnabled ? 'Order Sound Alert Enabled' : 'Order Sound Alert Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Chime ON' : 'Chime Muted'}</span>
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <LoadingSpinner message="Connecting to live order stream..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.length === 0 ? (
            <div className="col-span-full py-16 text-center text-cafe-500 font-medium">
              No orders found for this filter.
            </div>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                onUpdateStatus={handleUpdateStatus}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default OrderManagerPage;
