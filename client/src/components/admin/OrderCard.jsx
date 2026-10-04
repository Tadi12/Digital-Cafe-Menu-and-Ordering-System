import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '../../context/LanguageContext';
import OrderStatusBadge from '../customer/OrderStatusBadge';
import OrderStatusActionButton from '../common/OrderStatusActionButton';
import { formatCurrency } from '../../utils/currencyFormatter';
import { Clock, User, MapPin, Banknote } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  paymentMethodLabel,
  paymentStatusLabel,
} from '../../utils/orderStatus';

const OrderCard = ({ order, onUpdateStatus, pendingTarget, succeededStatus }) => {
  const { t } = useTranslation();
  const { currentLang } = useContext(LanguageContext);
  const { admin } = useAuth();
  const role = admin?.role || 'waiter';

  const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedDate = new Date(order.createdAt).toLocaleDateString();

  return (
    <div className="bg-white rounded-2xl border border-cafe-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
      {/* Header Banner */}
      <div className="bg-cafe-50 px-4 py-3 border-b border-cafe-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm text-cafe-900">{order.orderNumber}</span>
          <span className="text-xs text-cafe-400 font-mono">({formattedTime})</span>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Body Details */}
      <div className="p-4 space-y-3 flex-1">
        {/* Customer & Table */}
        <div className="flex items-center justify-between text-xs border-b border-cafe-50 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-cafe-900">
            <User className="w-3.5 h-3.5 text-cafe-600" />
            <span>{order.customerName}</span>
          </div>
          <div className="flex items-center gap-1 font-extrabold text-cafe-800 bg-cafe-100 px-2 py-0.5 rounded-md">
            <MapPin className="w-3 h-3 text-gold-600" />
            <span>{t('table_number_label', { number: order.tableNumberSnapshot })}</span>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-1.5 py-1">
          {order.items.map((item, idx) => {
            const foodName = item.foodName ? item.foodName[currentLang] || item.foodName.en : t('food');
            return (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded bg-cafe-100 text-cafe-900 font-bold flex items-center justify-center text-[10px] shrink-0">
                    {item.quantity}x
                  </span>
                  <span className="text-cafe-800 font-medium truncate">{foodName}</span>
                </div>
                <span className="font-semibold text-cafe-700 shrink-0">
                  {formatCurrency(item.price * item.quantity, currentLang)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Total & Payment */}
        <div className="flex items-center justify-between border-t border-cafe-100 pt-2.5">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
            <Banknote className="w-3.5 h-3.5" />
            <span>{paymentMethodLabel(order.paymentMethod, t)} ({paymentStatusLabel(order.paymentStatus, t)})</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-cafe-500 block uppercase font-bold">{t('total')}</span>
            <span className="text-base font-black text-cafe-900">
              {formatCurrency(order.totalAmount, currentLang)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer: exactly one action for the current status, with its own
          loading and success states. Terminal orders render no button at all. */}
      <div className="p-3 bg-cafe-50 border-t border-cafe-100">
        <OrderStatusActionButton
          order={order}
          role={role}
          onUpdate={onUpdateStatus}
          pendingTarget={pendingTarget}
          succeededStatus={succeededStatus}
        />
      </div>
    </div>
  );
};

export default OrderCard;
