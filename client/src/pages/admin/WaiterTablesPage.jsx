import React from 'react';
import { useTranslation } from 'react-i18next';
import WaiterTablesPanel from '../../components/admin/WaiterTablesPanel';

/**
 * The waiter's own tables — `/waiter/tables`.
 *
 * This lives on its own page rather than inside the dashboard, because the two
 * answer different questions. The dashboard is "what needs doing now?" (metrics,
 * deliveries, the order queue). This page is "which tables am I responsible for?"
 * and it drills into one table's order history at a time.
 *
 * The panel below does its own server-scoped fetch, so this page stays a thin
 * shell and the ownership rules remain in one place.
 */
const WaiterTablesPage = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-cafe-900">
          {t('my_tables_title')}
        </h2>
        <p className="text-xs text-cafe-500">{t('my_tables_desc')}</p>
      </div>
      <WaiterTablesPanel />
    </div>
  );
};

export default WaiterTablesPage;
