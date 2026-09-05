import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '../../context/LanguageContext';
import { getOrderByIdApi } from '../../api/orderApi';
import Header from '../../components/common/Header';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import OrderStatusBadge from '../../components/customer/OrderStatusBadge';
import { formatCurrency } from '../../utils/currencyFormatter';
import { CheckCircle2, MapPin, User, Banknote, ArrowRight, RefreshCw } from 'lucide-react';

const OrderConfirmationPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentLang } = useContext(LanguageContext);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await getOrderByIdApi(orderId);
        if (res.success) {
          setOrder(res.data);
        }
      } catch (err) {
        console.error('[Order Fetch Error]:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cafe-50 flex flex-col justify-center">
        <LoadingSpinner message="Fetching order confirmation..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-cafe-50 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-semibold text-cafe-700">Order details not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cafe-50 max-w-md mx-auto relative shadow-xl border-x border-cafe-200 flex flex-col">
      <Header />

      <div className="flex-1 p-5 space-y-6">
        {/* Success Card Banner */}
        <div className="bg-white rounded-2xl p-6 border border-cafe-200 text-center shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-cafe-900">
              {t('order_confirmation_title')}
            </h2>
            <p className="text-xs text-cafe-600 font-medium mt-1">
              {t('order_placed_success')}
            </p>
          </div>

          <div className="pt-2 border-t border-cafe-100 flex items-center justify-between text-xs font-bold text-cafe-800">
            <span>{t('order_number')} {order.orderNumber}</span>
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-2xl p-5 border border-cafe-200 shadow-sm space-y-4">
          <h3 className="text-xs font-extrabold text-cafe-800 uppercase tracking-wider border-b border-cafe-100 pb-2">
            Summary Details
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 text-cafe-700 bg-cafe-50 p-2.5 rounded-xl border border-cafe-100">
              <User className="w-4 h-4 text-cafe-500 shrink-0" />
              <div>
                <span className="text-[10px] text-cafe-400 block font-bold">{t('customer_name')}</span>
                <span className="font-bold text-cafe-900">{order.customerName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-cafe-700 bg-cafe-50 p-2.5 rounded-xl border border-cafe-100">
              <MapPin className="w-4 h-4 text-gold-600 shrink-0" />
              <div>
                <span className="text-[10px] text-cafe-400 block font-bold">Table</span>
                <span className="font-bold text-cafe-900">Table #{order.tableNumberSnapshot}</span>
              </div>
            </div>
          </div>

          {/* Ordered Items List */}
          <div className="space-y-2 pt-1 border-t border-cafe-100">
            {order.items.map((item, idx) => {
              const name = item.foodName[currentLang] || item.foodName.en;
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-cafe-100 text-cafe-900 font-bold flex items-center justify-center text-[10px]">
                      {item.quantity}x
                    </span>
                    <span className="font-semibold text-cafe-800">{name}</span>
                  </div>
                  <span className="font-bold text-cafe-900">
                    {formatCurrency(item.price * item.quantity, currentLang)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Total & Payment */}
          <div className="pt-3 border-t border-cafe-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
              <Banknote className="w-4 h-4" />
              <span>{order.paymentMethod} ({t('cash_on_table')})</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-cafe-400 block font-bold">{t('total')}</span>
              <span className="text-lg font-black text-cafe-900">
                {formatCurrency(order.totalAmount, currentLang)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Track Order Button */}
      <div className="p-5 bg-white border-t border-cafe-200">
        <button
          onClick={() => navigate(`/order-track/${order._id}`)}
          className="w-full bg-cafe-800 hover:bg-cafe-900 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t('track_order')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
