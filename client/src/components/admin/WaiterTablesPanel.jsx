import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { LanguageContext } from '../../context/LanguageContext';
import { getMyTablesApi, getTableOrdersApi } from '../../api/orderApi';
import OrderStatusBadge from '../../components/customer/OrderStatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { UtensilsCrossed, Coffee, ChevronDown, Clock, Inbox } from 'lucide-react';
import { formatCurrency } from '../../utils/currencyFormatter';
import { resolveApiError } from '../../utils/apiError';

/**
 * "My Tables" — the waiter's own station, plus the orders on each of those tables.
 *
 * Two properties matter here and both come from the API rather than the UI:
 *
 *  1. The table list is whatever the backend decided the waiter owns. The client
 *     never filters by a locally-known waiter id, so tampering with the page
 *     cannot surface another waiter's tables.
 *  2. Expanding a table calls a per-table endpoint that re-verifies ownership and
 *     answers 403 for a table that is not this waiter's — so editing a URL or a
 *     request id gets a refusal, not somebody else's orders.
 */
const WaiterTablesPanel = () => {
  const { t } = useTranslation();
  const { currentLang } = useContext(LanguageContext);

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // One table expanded at a time; null means the list is collapsed.
  const [expandedId, setExpandedId] = useState(null);
  const [tableOrders, setTableOrders] = useState({});
  const [loadingOrdersFor, setLoadingOrdersFor] = useState(null);

  const fetchTables = useCallback(async () => {
    try {
      const res = await getMyTablesApi();
      if (res.success) setTables(res.data || []);
    } catch (err) {
      // A 403 here means the session is no longer a waiter; surface it rather
      // than showing an empty station that looks like "no tables assigned".
      setError(resolveApiError(err, t, 'my_tables_load_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Live refresh: the assignment can change while the screen is open, so the list
  // is polled rather than fetched once and trusted for the rest of the shift.
  useEffect(() => {
    const timer = window.setInterval(fetchTables, 30000);
    return () => window.clearInterval(timer);
  }, [fetchTables]);

  const toggleTable = async (table) => {
    const nextId = expandedId === table._id ? null : table._id;
    setExpandedId(nextId);

    // Already loaded: reuse the cached list instead of refetching on every toggle.
    if (!nextId || tableOrders[nextId]) return;

    setLoadingOrdersFor(nextId);
    try {
      const res = await getTableOrdersApi(nextId);
      if (res.success) {
        setTableOrders((prev) => ({ ...prev, [nextId]: res.data || [] }));
      }
    } catch (err) {
      // Ownership was refused (403) or the request failed. Collapse the panel and
      // explain, rather than rendering an empty list implying "no orders".
      setExpandedId(null);
      toast.error(resolveApiError(err, t, 'table_orders_load_failed'));
    } finally {
      setLoadingOrdersFor(null);
    }
  };

  if (loading) return <LoadingSpinner message={t('loading_my_tables')} />;

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
        {error}
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-cafe-200 text-center space-y-2">
        <Inbox className="w-10 h-10 mx-auto text-cafe-300" aria-hidden="true" />
        <p className="font-bold text-cafe-900">{t('no_tables_assigned_title')}</p>
        <p className="text-xs text-cafe-500">{t('no_tables_assigned_desc')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {tables.map((table) => {
        const isOpen = expandedId === table._id;
        const orders = tableOrders[table._id] || [];
        const hasActive = (table.activeOrderCount || 0) > 0;

        return (
          <div
            key={table._id}
            className="rounded-2xl border border-cafe-200 bg-white shadow-sm overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleTable(table)}
              aria-expanded={isOpen}
              className="w-full p-4 flex items-center justify-between gap-3 text-left transition-colors hover:bg-cafe-50"
            >
              <div className="min-w-0">
                <span className="font-extrabold text-cafe-900 block">
                  {t('table_number_label', { number: table.tableNumber })}
                </span>
                {table.tableName && (
                  <span className="text-[11px] text-cafe-500 block truncate">
                    {table.tableName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Occupancy comes from the existing claim system, untouched. */}
                <span
                  className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    table.occupied
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {table.occupied ? t('table_occupied') : t('table_available')}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-cafe-400 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </div>
            </button>

            <div className="px-4 pb-3 -mt-1 flex items-center justify-between text-[11px] font-bold">
              <span className={hasActive ? 'text-amber-700' : 'text-cafe-400'}>
                {t('active_orders_count', { count: table.activeOrderCount || 0 })}
              </span>
              <span className="text-cafe-400">
                {t('total_orders_count', { count: table.totalOrderCount || 0 })}
              </span>
            </div>

            {isOpen && (
              <div className="border-t border-cafe-100 bg-cafe-50 p-3 space-y-2">
                {loadingOrdersFor === table._id ? (
                  <LoadingSpinner message={t('loading_table_orders')} />
                ) : orders.length === 0 ? (
                  <p className="text-xs text-cafe-500 text-center py-3">
                    {t('no_orders_for_table')}
                  </p>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order._id}
                      className="p-3 rounded-xl bg-white border border-cafe-200 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-xs text-cafe-900">
                          {order.orderNumber}
                        </span>
                        <OrderStatusBadge status={order.status} />
                      </div>

                      <ul className="space-y-1">
                        {(order.items || []).map((item, idx) => {
                          const name =
                            item.foodName?.[currentLang] ||
                            item.foodName?.en ||
                            t('food');
                          // itemType is the snapshot taken when the order was
                          // placed, so the chef/barista split is visible here too.
                          const Icon =
                            item.itemType === 'drink' ? Coffee : UtensilsCrossed;
                          return (
                            <li
                              key={idx}
                              className="flex items-center justify-between text-[11px] text-cafe-700"
                            >
                              <span className="flex items-center gap-1.5 min-w-0">
                                <Icon
                                  className="w-3 h-3 shrink-0 text-cafe-500"
                                  aria-hidden="true"
                                />
                                <span className="truncate">
                                  {item.quantity}x {name}
                                </span>
                              </span>
                              <span className="font-semibold shrink-0">
                                {formatCurrency(
                                  item.price * item.quantity,
                                  currentLang,
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>

                      <div className="flex items-center justify-between pt-2 border-t border-cafe-100 text-[11px] font-bold text-cafe-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>
                          {t('total')}:{' '}
                          {formatCurrency(order.totalAmount, currentLang)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WaiterTablesPanel;
