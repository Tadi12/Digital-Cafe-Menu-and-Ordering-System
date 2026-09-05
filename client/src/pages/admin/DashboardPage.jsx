import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '../../context/LanguageContext';
import { getDashboardMetricsApi, getRevenueAnalyticsApi } from '../../api/analyticsApi';
import MetricCard from '../../components/admin/MetricCard';
import OrderStatusBadge from '../../components/customer/OrderStatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency } from '../../utils/currencyFormatter';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import {
  Banknote,
  ShoppingBag,
  Clock,
  ChefHat,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

const DashboardPage = () => {
  const { t } = useTranslation();
  const { currentLang } = useContext(LanguageContext);

  const [metrics, setMetrics] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricRes, revRes] = await Promise.all([
          getDashboardMetricsApi(),
          getRevenueAnalyticsApi(7),
        ]);

        if (metricRes.success) setMetrics(metricRes.data);
        if (revRes.success) setRevenueData(revRes.data);
      } catch (err) {
        console.error('[Dashboard Fetch Error]:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading dashboard analytics..." />;
  }

  const PIE_COLORS = ['#D97706', '#2563EB', '#059669', '#4B5563', '#DC2626'];

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('total_revenue_today')}
          value={formatCurrency(metrics?.todayRevenue || 0, currentLang)}
          icon={Banknote}
          color="bg-emerald-600 text-white"
          subtext="Today's total sales"
        />
        <MetricCard
          title={t('orders_today')}
          value={metrics?.ordersToday || 0}
          icon={ShoppingBag}
          color="bg-cafe-800 text-white"
          subtext="New customer orders"
        />
        <MetricCard
          title={t('pending_orders')}
          value={metrics?.pendingOrders || 0}
          icon={Clock}
          color="bg-amber-600 text-white"
          subtext="Awaiting preparation"
        />
        <MetricCard
          title={t('preparing_orders')}
          value={metrics?.preparingOrders || 0}
          icon={ChefHat}
          color="bg-blue-600 text-white"
          subtext="Currently in kitchen"
        />
      </div>

      {/* Recharts Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Bar Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-cafe-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-cafe-900 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Revenue Analytics (Last 7 Days)
              </h3>
              <p className="text-xs text-cafe-500">Daily total revenue breakdown in ETB</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip
                  formatter={(value) => [`${value} ETB`, 'Revenue']}
                  contentStyle={{ borderRadius: '12px', borderColor: '#E5E7EB' }}
                />
                <Bar dataKey="revenue" fill="#8B5A2B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Pie Chart (1 Col) */}
        <div className="bg-white rounded-2xl p-5 border border-cafe-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-cafe-900 text-sm">Order Status Breakdown</h3>
            <p className="text-xs text-cafe-500">Distribution of all cafe orders</p>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics?.statusBreakdown || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {(metrics?.statusBreakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-cafe-100">
            {(metrics?.statusBreakdown || []).map((item, idx) => (
              <div key={item.name} className="flex items-center gap-1.5 font-semibold text-cafe-700">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                />
                <span>{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders List Table */}
      <div className="bg-white rounded-2xl p-5 border border-cafe-200 shadow-sm space-y-4">
        <h3 className="font-bold text-cafe-900 text-sm">Recent Incoming Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-cafe-50 text-cafe-700 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3">Order #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Table</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cafe-100 font-medium text-cafe-800">
              {metrics?.recentOrders?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-cafe-500">
                    No orders recorded yet.
                  </td>
                </tr>
              ) : (
                metrics?.recentOrders?.map((ord) => (
                  <tr key={ord._id} className="hover:bg-cafe-50/50 transition-colors">
                    <td className="p-3 font-bold">{ord.orderNumber}</td>
                    <td className="p-3">{ord.customerName}</td>
                    <td className="p-3 font-bold">Table #{ord.tableNumberSnapshot}</td>
                    <td className="p-3 font-extrabold">
                      {formatCurrency(ord.totalAmount, currentLang)}
                    </td>
                    <td className="p-3">
                      <OrderStatusBadge status={ord.status} />
                    </td>
                    <td className="p-3 text-cafe-400 text-[11px]">
                      {new Date(ord.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
