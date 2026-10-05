import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react';
import MetricCard from './MetricCard';
import OrderStatusBadge from '../customer/OrderStatusBadge';

/**
 * The shared layout for every staff dashboard: admin aside, this is what the
 * chef, the barista and the waiter all render.
 *
 * Keeping the header, the "Open Order Queue" call to action, the metric row and
 * the work list in one place is what makes the three station screens read as the
 * same product. Each role supplies only its own numbers, its own rows and its own
 * copy; the arrangement, spacing and the queue entry point are identical, so the
 * queue can never go missing from one of them.
 *
 * @param {string}   props.title          heading
 * @param {string}   props.description    one-line subheading
 * @param {string}   props.queuePath      where the order queue lives for this role
 * @param {Array}    props.metrics        [{ title, value, icon, tone }]
 * @param {Array}    props.rows           work-list rows (already filtered/sorted)
 * @param {Function} props.renderRow      (row) => JSX for one row
 * @param {ReactNode} [props.emptyIcon]   shown when there is no work
 * @param {ReactNode} [props.children]    extra sections below (e.g. My Tables)
 */
const StaffDashboardShell = ({
  title,
  description,
  queuePath,
  metrics = [],
  rows = [],
  renderRow,
  emptyIcon,
  children,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const listTitle = t('my_active_orders_title');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-cafe-900">{title}</h2>
        {description && <p className="text-xs text-cafe-500">{description}</p>}
      </div>

      {/* The queue is every station's main job, so it gets the most prominent
          control on the page — this is what makes it impossible to miss. */}
      <button
        type="button"
        onClick={() => navigate(queuePath)}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-cafe-800 hover:bg-cafe-900 text-white font-bold text-sm shadow transition-colors"
      >
        <ClipboardList className="w-5 h-5" aria-hidden="true" />
        {t('open_order_queue')}
      </button>

      {metrics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              icon={metric.icon}
              tone={metric.tone}
            />
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 border border-cafe-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-cafe-900 text-base">
            {listTitle}
          </h3>
          <button
            type="button"
            onClick={() => navigate(queuePath)}
            className="text-xs font-bold text-cafe-600 hover:text-cafe-900 transition-colors"
          >
            {t('view_all_orders')}
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="py-8 text-center text-cafe-500 text-sm">
            {emptyIcon && (
              <div className="w-8 h-8 mx-auto mb-2 text-cafe-300" aria-hidden="true">
                {emptyIcon}
              </div>
            )}
            {t('no_orders_recorded')}
          </div>
        ) : (
          <ul className="divide-y divide-cafe-100">{rows.map(renderRow)}</ul>
        )}
      </div>

      {children}
    </div>
  );
};

export default StaffDashboardShell;
