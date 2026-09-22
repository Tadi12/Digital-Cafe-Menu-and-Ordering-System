import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '../../context/LanguageContext';
import { getRevenueAnalyticsApi, getPopularFoodsAnalyticsApi } from '../../api/analyticsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency } from '../../utils/currencyFormatter';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { BarChart3, TrendingUp, Award } from 'lucide-react';

const BrandTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip rounded-xl border p-3 shadow-lg"><p className="mb-1 text-xs font-bold">{label}</p>{payload.map((entry) => <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>{formatter ? formatter(entry.value, entry.name) : `${entry.name}: ${entry.value}`}</p>)}</div>;
};

const AnalyticsPage = () => {
  const { t } = useTranslation();
  const { currentLang } = useContext(LanguageContext);

  const [timeRange, setTimeRange] = useState(7);
  const [revenueData, setRevenueData] = useState([]);
  const [popularFoods, setPopularFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [revRes, popRes] = await Promise.all([
          getRevenueAnalyticsApi(timeRange),
          getPopularFoodsAnalyticsApi(),
        ]);

        if (revRes.success) setRevenueData(revRes.data);
        if (popRes.success) setPopularFoods(popRes.data);
      } catch (err) {
        console.error('[Analytics Fetch Error]:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  if (loading) {
    return <LoadingSpinner message={t("loading_analytics")} />;
  }

  const totalPeriodRevenue = revenueData.reduce((acc, item) => acc + item.revenue, 0);
  const totalPeriodOrders = revenueData.reduce((acc, item) => acc + item.orderCount, 0);
  const popularChartData = popularFoods.map((item) => ({
    ...item,
    chartName: item.name[currentLang] || item.name.en,
  }));

  return (
    <div className="space-y-6">
      {/* Top Filter */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-cafe-200 shadow-sm">
        <div>
        <h2 className="font-display font-semibold text-cafe-900 text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cafe-700" />
            <span>{t("cafe_financial_menu_performance")}</span>
          </h2>

        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-cafe-700">{t("period")}:</span>
          <button
            onClick={() => setTimeRange(7)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              timeRange === 7
                ? 'bg-cafe-800 text-white shadow'
                : 'bg-cafe-100 text-cafe-800 hover:bg-cafe-200'
            }`}
          >
            {t("last_7_days")}
          </button>
          <button
            onClick={() => setTimeRange(30)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              timeRange === 30
                ? 'bg-cafe-800 text-white shadow'
                : 'bg-cafe-100 text-cafe-800 hover:bg-cafe-200'
            }`}
          >
            {t("last_30_days")}
          </button>
        </div>
      </div>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-cafe-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-cafe-500 font-bold uppercase">
              {t("total_revenue_period", { days: timeRange })}
            </span>
            <h3 className="text-2xl font-black text-cafe-900 mt-1">
              {formatCurrency(totalPeriodRevenue, currentLang)}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-cafe-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-cafe-500 font-bold uppercase">
              {t("total_completed_orders_period", { days: timeRange })}
            </span>
            <h3 className="text-2xl font-black text-cafe-900 mt-1">{t("orders_count", { count: totalPeriodOrders })}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cafe-100 text-cafe-800 flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Revenue Area Chart */}
      <div className="bg-white rounded-2xl p-5 border border-cafe-200 shadow-sm space-y-4">
        <h3 className="font-bold text-cafe-900 text-sm">{t("revenue_trend")}</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5A2B" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8B5A2B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--analytics-grid)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--analytics-axis)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--analytics-axis)' }} />
              <Tooltip
                content={(props) => <BrandTooltip {...props} formatter={(value) => `${value} ETB`} />}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#8B5A2B"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Selling Foods Chart */}
      <div className="bg-white rounded-2xl p-4 border border-cafe-200 shadow-sm space-y-4">
        <h3 className="font-display font-semibold text-cafe-900 text-base">{t("total_sales_generated")}</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={popularChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--analytics-grid)" />
              <XAxis dataKey="chartName" interval={0} angle={-20} textAnchor="end" height={56} tick={{ fontSize: 10, fill: 'var(--analytics-axis)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--analytics-axis)' }} />
              <Tooltip content={(props) => <BrandTooltip {...props} formatter={(value) => formatCurrency(value, currentLang)} />} />
              <Bar dataKey="totalRevenue" name={t("total_sales_generated")} fill="#D97706" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Selling Foods Report Table */}
      <div className="bg-white rounded-2xl p-4 border border-cafe-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-gold-600" />
          <h3 className="font-display font-semibold text-cafe-900 text-base">{t("popular_items")}</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-cafe-50 text-cafe-700 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3">{t("rank")}</th>
                <th className="p-3">{t("food_item_name")}</th>
                <th className="p-3">{t("quantity_sold")}</th>
                <th className="p-3">{t("total_sales_generated")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cafe-100 font-medium text-cafe-800">
              {popularFoods.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-cafe-500">
                    {t("no_sales_records")}
                  </td>
                </tr>
              ) : (
                popularFoods.map((item, idx) => {
                  const foodName = item.name[currentLang] || item.name.en;
                  return (
                    <tr key={item.foodId} className="hover:bg-cafe-50/50 transition-colors">
                      <td className="p-3 font-bold text-cafe-500">#{idx + 1}</td>
                      <td className="p-3 font-bold text-cafe-900">{foodName}</td>
                      <td className="p-3 font-extrabold text-cafe-800">
                        {item.totalQuantity} items
                      </td>
                      <td className="p-3 font-black text-emerald-700">
                        {formatCurrency(item.totalRevenue, currentLang)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
