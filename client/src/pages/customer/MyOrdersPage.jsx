import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { getCustomerOrdersApi } from "../../api/orderApi";
import { LanguageContext } from "../../context/LanguageContext";
import Header from "../../components/common/Header";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import OrderStatusBadge from "../../components/customer/OrderStatusBadge";
import { formatCurrency } from "../../utils/currencyFormatter";
import { ArrowLeft, Fingerprint, User, Calendar } from "lucide-react";
import {
  mergeCustomerOrderHistory,
  readCustomerOrderHistory,
} from "../../utils/customerOrderHistory";

const MyOrdersPage = () => {
  const navigate = useNavigate();
  const { customerName, customerSessionId } = useCart();
  const { currentLang } = useContext(LanguageContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      if (!customerName || !customerName.trim()) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const cachedOrders = readCustomerOrderHistory(
        customerName,
        customerSessionId,
      );

      try {
        const response = await getCustomerOrdersApi({
          customerName,
          customerSessionId,
        });
        const serverOrders = response?.success ? response.data || [] : [];
        const merged = mergeCustomerOrderHistory(
          customerName,
          customerSessionId,
          serverOrders,
          cachedOrders,
        );
        setOrders(merged);
      } catch (err) {
        console.error("[My Orders Error]:", err);
        setOrders(cachedOrders);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [customerName, customerSessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cafe-50 flex flex-col justify-center">
        <LoadingSpinner message="Loading your order history..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cafe-50 max-w-md mx-auto relative shadow-xl border-x border-cafe-200 flex flex-col">
      <Header />

      <div className="p-4 bg-cafe-900 text-white flex items-center justify-between shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-cafe-200 hover:text-white font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="text-xs font-bold text-emerald-400">My Orders</div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="bg-white rounded-2xl border border-cafe-200 p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-cafe-700">
            <User className="w-4 h-4" />
            <span className="text-sm font-bold">
              {customerName || "Unknown customer"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-cafe-600 text-xs">
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Session ID: {customerSessionId || "not available"}</span>
          </div>
        </div>

        {!customerName ? (
          <div className="bg-white rounded-2xl border border-cafe-200 p-5 text-center text-sm text-cafe-600">
            Please enter your name before viewing your orders.
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-cafe-200 p-5 text-center text-sm text-cafe-600">
            No orders yet for this customer. Your new orders will appear here.
          </div>
        ) : (
          orders.map((order) => (
            <button
              key={order._id}
              type="button"
              onClick={() => navigate(`/order-track/${order._id}`)}
              className="w-full bg-white border border-cafe-200 rounded-2xl p-4 shadow-sm text-left hover:border-cafe-300 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-cafe-500">
                    Order
                  </div>
                  <div className="text-sm font-black text-cafe-900 mt-1">
                    {order.orderNumber}
                  </div>
                </div>
                <OrderStatusBadge
                  status={order.status}
                  className="text-[10px]"
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-cafe-700">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {new Date(
                      order.createdAt || Date.now(),
                    ).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-right font-bold text-cafe-900">
                  {formatCurrency(order.totalAmount || 0, currentLang)}
                </div>
              </div>

              <div className="mt-2 text-[11px] text-cafe-600">
                Table #
                {order.tableNumberSnapshot ?? order.table?.tableNumber ?? "-"}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default MyOrdersPage;
