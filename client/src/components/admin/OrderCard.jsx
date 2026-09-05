import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '../../context/LanguageContext';
import OrderStatusBadge from '../customer/OrderStatusBadge';
import { formatCurrency } from '../../utils/currencyFormatter';
import { Clock, User, MapPin, ChefHat, CheckCircle2, Check, Banknote } from 'lucide-react';

const OrderCard = ({ order, onUpdateStatus }) => {
  const { t } = useTranslation();
  const { currentLang } = useContext(LanguageContext);

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
            <span>Table #{order.tableNumberSnapshot}</span>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-1.5 py-1">
          {order.items.map((item, idx) => {
            const foodName = item.foodName ? item.foodName[currentLang] || item.foodName.en : 'Food Item';
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
            <span>{order.paymentMethod} ({order.paymentStatus})</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-cafe-500 block uppercase font-bold">{t('total')}</span>
            <span className="text-base font-black text-cafe-900">
              {formatCurrency(order.totalAmount, currentLang)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer Button based on Status */}
      <div className="p-3 bg-cafe-50 border-t border-cafe-100">
        {order.status === 'Pending' && (
          <button
            onClick={() => onUpdateStatus(order._id, 'Preparing')}
            className="w-full bg-gold-500 hover:bg-gold-600 text-white py-2 px-3 rounded-xl font-bold text-xs shadow flex items-center justify-center gap-1.5 transition-colors"
          >
            <ChefHat className="w-4 h-4" />
            <span>Start Preparing</span>
          </button>
        )}

        {order.status === 'Preparing' && (
          <button
            onClick={() => onUpdateStatus(order._id, 'Ready')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-xl font-bold text-xs shadow flex items-center justify-center gap-1.5 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark Ready</span>
          </button>
        )}

        {order.status === 'Ready' && (
          <button
            onClick={() => onUpdateStatus(order._id, 'Completed')}
            className="w-full bg-cafe-800 hover:bg-cafe-900 text-white py-2 px-3 rounded-xl font-bold text-xs shadow flex items-center justify-center gap-1.5 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Complete Order</span>
          </button>
        )}

        {order.status === 'Completed' && (
          <div className="text-center py-1 text-xs font-bold text-gray-500">
            Order Completed
          </div>
        )}

        {order.status === 'Cancelled' && (
          <div className="text-center py-1 text-xs font-bold text-red-500">
            Order Cancelled
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderCard;
