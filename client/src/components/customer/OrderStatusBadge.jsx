import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, ChefHat, CheckCircle2, Check, XCircle } from 'lucide-react';
import { orderStatusLabel } from '../../utils/orderStatus';

const OrderStatusBadge = ({ status, className = '' }) => {
  const { t } = useTranslation();

  const getStatusConfig = () => {
    switch (status) {
      case 'Pending':
        return {
          label: t('status_pending'),
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: Clock,
        };
      case 'Preparing':
        return {
          label: t('status_preparing'),
          bg: 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse',
          icon: ChefHat,
        };
      case 'Ready':
        return {
          label: t('status_ready'),
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: CheckCircle2,
        };
      case 'Completed':
        return {
          label: t('status_completed'),
          bg: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: Check,
        };
      case 'Cancelled':
        return {
          label: t('status_cancelled'),
          bg: 'bg-red-100 text-red-800 border-red-300',
          icon: XCircle,
        };
      default:
        return {
          label: orderStatusLabel(status, t),
          bg: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: Clock,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span
      // Re-keying on the status replays the transition every time the order
      // moves, so a socket update is visible rather than a silent swap.
      key={status}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors duration-300 animate-fadeIn ${config.bg} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};

export default OrderStatusBadge;
