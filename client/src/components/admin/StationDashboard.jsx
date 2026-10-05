import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle2, ChefHat, Coffee, UtensilsCrossed } from 'lucide-react';
import { getOrdersApi } from '../../api/orderApi';
import OrderStatusBadge from '../customer/OrderStatusBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import StaffDashboardShell from './StaffDashboardShell';
import { staffBasePath } from '../../utils/staffRoles';
import { isOrderClosed, stationStatusLabel } from '../../utils/orderStatus';

/**
 * The chef's and the barista's dashboard.
 *
 * The counts come from the SAME endpoint the order queue uses, and that endpoint
 * is already narrowed server-side by role, so this screen can only ever show the
 * caller's own tickets — the chef sees food, the barista sees drinks. Nothing is
 * filtered here, because nothing should need to be.
 *
 * It shares StaffDashboardShell with the waiter's dashboard so all three station
 * screens have the same shape: heading, a prominent "Open Order Queue" button, a
 * metric row, and a work list. The preparation buttons themselves stay on the
 * queue, where the loading and duplicate-click handling already exists.
 */
const StationDashboard = ({ role }) => {
  const { t } = useTranslation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const isDrink = role === 'barista';
  const queuePath = `${staffBasePath(role)}/orders`;
  const StationIcon = isDrink ? Coffee : UtensilsCrossed;

  const fetchOrders = useCallback(async () => {
    try {
      const res = await getOrdersApi();
      if (res.success) setOrders(res.data || []);
    } catch (err) {
      console.error('[Station Dashboard Fetch Error]:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // The kitchen works in real time, so the summary refreshes on its own rather
  // than going stale between queue visits.
  useEffect(() => {
    const timer = window.setInterval(fetchOrders, 30000);
    return () => window.clearInterval(timer);
  }, [fetchOrders]);

  if (loading) return <LoadingSpinner message={t('loading_dashboard')} />;

  // `stationStatus` is set by the API when it narrows the order to this station.
  const statusOf = (order) => order.stationStatus || 'pending';

  // A track is pinned at 'ready' for the rest of the day, so an order the floor has
  // already completed still reports 'ready' here. Counting and listing those would
  // make the "Ready" tile a permanent high-water mark that only ever grows, and
  // keep served orders in the work list — so a closed order is excluded from both.
  // The counts therefore describe work the station can still act on.
  const open = orders.filter((order) => !isOrderClosed(order.status));
  const count = (status) => open.filter((o) => statusOf(o) === status).length;
  const active = open.filter((o) =>
    ['pending', 'preparing', 'ready'].includes(statusOf(o)),
  );

  const metrics = [
    { title: t('status_pending'), value: count('pending'), icon: Clock, tone: 'amber' },
    { title: t('status_preparing'), value: count('preparing'), icon: ChefHat, tone: 'blue' },
    { title: t('status_ready'), value: count('ready'), icon: CheckCircle2, tone: 'emerald' },
  ];

  return (
    <StaffDashboardShell
      title={isDrink ? t('barista_dashboard_title') : t('chef_dashboard_title')}
      description={isDrink ? t('barista_dashboard_desc') : t('chef_dashboard_desc')}
      queuePath={queuePath}
      metrics={metrics}
      rows={active.slice(0, 6)}
      emptyIcon={<StationIcon className="w-full h-full" />}
      renderRow={(order) => (
        <li key={order._id} className="py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <StationIcon className="w-4 h-4 text-cafe-500 shrink-0" aria-hidden="true" />
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
            {/* Follows the overall outcome once the order is closed — see
                stationStatusLabel, and why the track is never written to
                'completed'. */}
            <span className="text-[11px] font-bold uppercase text-cafe-500">
              {stationStatusLabel(order, t)}
            </span>
            <OrderStatusBadge status={order.status} />
          </div>
        </li>
      )}
    />
  );
};

export default StationDashboard;
