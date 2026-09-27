import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, ChefHat, CheckCircle2, Check, XCircle } from 'lucide-react';

const OrderStatusBadge = ({ status, className = '' }) => {
  const { t } = useTranslation();

  const getStatusConfig = () => {
    switch (status) {
      case 'Pending':
        return {
          label: t('status_pending'),
          bg: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40',
          icon: Clock,
        };
      case 'Preparing':
        return {
          label: t('status_preparing'),
          bg: 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/40',
          icon: ChefHat,
        };
      case 'Ready':
        return {
          label: t('status_ready'),
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40',
          icon: CheckCircle2,
        };
      case 'Completed':
        return {
          label: t('status_completed'),
          bg: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-white/10 dark:text-gray-200 dark:border-white/20',
          icon: Check,
        };
      case 'Cancelled':
        return {
          label: t('status_cancelled'),
          bg: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/40',
          icon: XCircle,
        };
      default:
        return {
          label: status,
          bg: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/20',
          icon: Clock,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${config.bg} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};

export default OrderStatusBadge;
