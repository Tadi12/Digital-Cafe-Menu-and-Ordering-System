import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Users, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { getOrdersApi, getMyTablesApi } from '../../api/orderApi';
import OrderStatusBadge from '../customer/OrderStatusBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import StaffDashboardShell from './StaffDashboardShell';
import { preparationStatusLabel, canCompleteOrder } from '../../utils/orderStatus';
import { staffBasePath } from '../../utils/staffRoles';

const ACTIVE_STATUSES = ['Pending', 'Preparing', 'Ready'];

/**
 * The waiter's dashboard.
 *
 * Deliberately the same shape as the chef's and the barista's — same header, same
 * prominent "Open Order Queue" button, same metric row, same work list — so all
 * three station screens read as one product and the queue is never in doubt.
 *
 * Only the numbers differ, because the waiter's job is different: they are not
 * preparing anything, they are watching for orders that are READY TO SERVE. So
 * the metrics lead with tables and deliveries rather than kitchen statuses, and
 * the list flags which half of each order is still outstanding.
 *
 * Everything here is already scoped by the server to this waiter's assigned
 * tables, so there is no client-side filtering to keep in sync.
 */
const WaiterDashboard = () => {
  const { t } = useTranslation();

  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [orderRes, tableRes] = await Promise.all([
        getOrdersApi(),
        getMyTablesApi(),
      ]);
      if (orderRes.success) setOrders(orderRes.data || []);
      if (tableRes.success) setTables(tableRes.data || []);
    } catch (err) {
      console.error('[Waiter Dashboard Fetch Error]:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // A shift is long, so the summary keeps itself current.
  useEffect(() => {
    const timer = window.setInterval(fetchData, 30000);
    return () => window.clearInterval(timer);
  }, [fetchData]);

  if (loading) return <LoadingSpinner message={t('loading_dashboard')} />;

  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  // The delivery task: both halves prepared and the order waiting to be served.
  const readyToServe = active.filter((o) => canCompleteOrder(o));
  const inProgress = active.filter((o) => !canCompleteOrder(o));

  const metrics = [
    { title: t('my_tables'), value: tables.length, icon: Users, tone: 'cafe' },
    { title: t('active_orders_label'), value: active.length, icon: ShoppingBag, tone: 'blue' },
    { title: t('ready_to_serve_label'), value: readyToServe.length, icon: CheckCircle2, tone: 'emerald' },
  ];

  // Deliveries first: those are the orders the waiter can act on right now.
  const rows = [...readyToServe, ...inProgress].slice(0, 6);

  return (
    <StaffDashboardShell
      title={t('waiter_dashboard_title')}
      description={t('waiter_dashboard_desc')}
      queuePath={`${staffBasePath('waiter')}/orders`}
      metrics={metrics}
      rows={rows}
      emptyIcon={<ClipboardList className="w-full h-full" />}
      renderRow={(order) => (
        <li key={order._id} className="py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ClipboardList className="w-4 h-4 text-cafe-500 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <span className="font-bold text-sm text-cafe-900 block truncate">
                {order.orderNumber}
              </span>
              <span className="text-[11px] text-cafe-500">
                {t('table_number_label', { number: order.tableNumberSnapshot })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-cafe-500">
              {t('food_section_label')}:{' '}
              {preparationStatusLabel(order.foodStatus, t)}
            </span>
            <span className="text-[11px] font-bold text-cafe-500">
              {t('drink_section_label')}:{' '}
              {preparationStatusLabel(order.drinkStatus, t)}
            </span>
            <OrderStatusBadge status={order.overallStatus || order.status} />
          </div>
        </li>
      )}
    />
  );
};

export default WaiterDashboard;
