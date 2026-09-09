import React, { useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import { LanguageContext } from "../../context/LanguageContext";
import { useCart } from "../../hooks/useCart";
import { formatCurrency } from "../../utils/currencyFormatter";
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  Banknote,
  User,
  ChevronRight,
} from "lucide-react";

const CartDrawer = ({ isOpen, onClose, onPlaceOrder, table, isSubmitting }) => {
  const { t } = useTranslation();
  const { currentLang } = useContext(LanguageContext);
  const {
    cartItems,
    customerName,
    setCustomerName,
    customerSessionId,
    updateQuantity,
    removeFromCart,
    totalItemsCount,
    subtotal,
  } = useCart();

  const [nameError, setNameError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerName || !customerName.trim()) {
      setNameError(t("customer_name_placeholder"));
      return;
    }
    setNameError("");
    onPlaceOrder();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-cafe-900 text-white flex items-center justify-between shadow">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-gold-500" />
            <h2 className="text-base font-bold tracking-tight">
              {t("cart_title")}
            </h2>
            <span className="bg-cafe-700 text-cafe-100 text-xs px-2 py-0.5 rounded-full font-bold">
              {totalItemsCount}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-cafe-300 hover:text-white hover:bg-cafe-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-cafe-500">
              <ShoppingBag className="w-12 h-12 stroke-[1.5] text-cafe-300 mb-2" />
              <p className="font-semibold text-sm">{t("cart_empty")}</p>
            </div>
          ) : (
            <>
              {/* Table Info Badge */}
              {table && (
                <div className="bg-cafe-50 border border-cafe-200 rounded-xl p-3 flex items-center justify-between text-xs font-semibold text-cafe-800">
                  <span>
                    {t("welcome_table", { number: table.tableNumber })}
                  </span>
                  <span className="text-cafe-600 font-normal">
                    Auto-Identified
                  </span>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                {cartItems.map((item) => {
                  const itemName = item.name[currentLang] || item.name.en;
                  return (
                    <div
                      key={item._id}
                      className="flex items-center justify-between p-3 rounded-xl border border-cafe-100 bg-white shadow-sm gap-3"
                    >
                      <img
                        src={item.image.url}
                        alt={itemName}
                        className="w-12 h-12 rounded-lg object-cover bg-cafe-100 shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-cafe-900 truncate">
                          {itemName}
                        </h4>
                        <p className="text-xs font-extrabold text-cafe-700 mt-0.5">
                          {formatCurrency(
                            item.price * item.quantity,
                            currentLang,
                          )}
                        </p>
                      </div>

                      {/* Quantity buttons */}
                      <div className="flex items-center gap-1.5 bg-cafe-50 rounded-lg p-1 border border-cafe-200">
                        <button
                          onClick={() => updateQuantity(item._id, -1)}
                          className="w-6 h-6 rounded bg-white text-cafe-800 flex items-center justify-center shadow-xs font-bold hover:bg-cafe-100 active:scale-95"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-cafe-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item._id, 1)}
                          className="w-6 h-6 rounded bg-white text-cafe-800 flex items-center justify-center shadow-xs font-bold hover:bg-cafe-100 active:scale-95"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item._id)}
                        className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Customer Name Input */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cafe-600" />
                  {t("customer_name")} *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (e.target.value.trim()) setNameError("");
                  }}
                  placeholder={t("customer_name_placeholder")}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors bg-white ${
                    nameError
                      ? "border-red-500 text-red-900 ring-1 ring-red-500"
                      : "border-cafe-200 focus:border-cafe-600 focus:ring-1 focus:ring-cafe-600 text-cafe-900"
                  }`}
                  required
                />
                {nameError && (
                  <p className="text-xs text-red-600 font-medium mt-1">
                    {nameError}
                  </p>
                )}
                <p className="text-[10px] text-cafe-500 mt-1.5">
                  Your session keeps this customer history secure and private.
                </p>
              </div>

              {/* Payment Method Notice */}
              <div className="bg-cafe-50 border border-cafe-200 rounded-xl p-3 flex items-center gap-3 text-xs">
                <Banknote className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-cafe-900 block">
                    {t("payment_method")}
                  </span>
                  <span className="text-cafe-600">{t("cash_on_table")}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {cartItems.length > 0 && (
          <div className="p-5 border-t border-cafe-100 bg-cafe-50 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-cafe-700">
                {t("subtotal")}
              </span>
              <span className="font-bold text-cafe-900">
                {formatCurrency(subtotal, currentLang)}
              </span>
            </div>

            <div className="flex items-center justify-between text-base border-t border-cafe-200 pt-2">
              <span className="font-extrabold text-cafe-900">{t("total")}</span>
              <span className="font-black text-lg text-cafe-900">
                {formatCurrency(subtotal, currentLang)}
              </span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-cafe-800 hover:bg-cafe-900 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{t("place_order")}</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
