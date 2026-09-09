import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageContext } from "../../context/LanguageContext";
import { getTableByIdApi } from "../../api/tableApi";
import { getCategoriesApi } from "../../api/categoryApi";
import { getFoodsApi } from "../../api/foodApi";
import { createOrderApi, getCustomerOrdersApi } from "../../api/orderApi";
import { useCart } from "../../hooks/useCart";
import { useSocket } from "../../hooks/useSocket";

import Header from "../../components/common/Header";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import TableHeader from "../../components/customer/TableHeader";
import CategoryFilter from "../../components/customer/CategoryFilter";
import FoodCard from "../../components/customer/FoodCard";
import FoodDetailModal from "../../components/customer/FoodDetailModal";
import CartDrawer from "../../components/customer/CartDrawer";
import { formatCurrency } from "../../utils/currencyFormatter";
import {
  mergeCustomerOrderHistory,
  readCustomerOrderHistory,
  saveCustomerOrderToHistory,
} from "../../utils/customerOrderHistory";

import { Search, ShoppingBag, AlertCircle } from "lucide-react";

const MenuPage = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Keep the effect dependency below primitive/stable. The `t` function itself
  // may receive a new reference during a render and would restart menu loading.
  const invalidTableMessage = t("invalid_table_desc");
  const { currentLang } = useContext(LanguageContext);
  const { socket, joinOrderRoom, playNotificationSound } = useSocket();
  const {
    cartItems,
    addToCart,
    clearCart,
    totalItemsCount,
    subtotal,
    customerName,
    customerSessionId,
  } = useCart();

  const readyOrderIdsRef = useRef(new Set());
  const getNotifiedReadyOrders = () => {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem("cafe_customer_ready_notifications") ||
          "[]",
      );
      return Array.isArray(saved) ? saved : [];
    } catch (err) {
      return [];
    }
  };

  const markReadyOrderNotified = (orderId) => {
    if (!orderId) return;

    try {
      const notified = new Set(getNotifiedReadyOrders());
      notified.add(orderId);
      window.localStorage.setItem(
        "cafe_customer_ready_notifications",
        JSON.stringify([...notified]),
      );
    } catch (err) {
      console.error("[Ready Notification Cache Error]:", err);
    }
  };

  const [table, setTable] = useState(null);
  const [categories, setCategories] = useState([]);
  const [foods, setFoods] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState(null);
  const [customerOrderHistory, setCustomerOrderHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [readyToastVisible, setReadyToastVisible] = useState(false);
  const [readyToastOrder, setReadyToastOrder] = useState(null);

  const getCategoryType = (category) => category?.type || "food";
  const foodCategories = categories.filter(
    (category) => getCategoryType(category) === "food",
  );
  const drinkCategories = categories.filter(
    (category) => getCategoryType(category) === "drink",
  );

  const buildCategoryList = (items) =>
    items.map((category) => ({
      ...category,
      itemCount: foods.filter(
        (food) =>
          food.category?._id === category._id &&
          (food.category?.type || "food") === getCategoryType(category),
      ).length,
    }));

  const foodCategoryList = buildCategoryList(foodCategories);
  const drinkCategoryList = buildCategoryList(drinkCategories);

  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Validate table and fetch menu data whenever the QR table id changes
  useEffect(() => {
    let cancelled = false;

    const initMenu = async () => {
      setLoading(true);
      setTableError("");
      try {
        const tableRes = await getTableByIdApi(tableId);
        if (!tableRes.success || !tableRes.data) {
          throw new Error(tableRes.message || invalidTableMessage);
        }
        if (cancelled) return;
        setTable(tableRes.data);

        const [catRes, foodRes] = await Promise.all([
          getCategoriesApi(),
          getFoodsApi(),
        ]);

        if (cancelled) return;
        if (catRes.success) setCategories(catRes.data || []);
        if (foodRes.success) setFoods(foodRes.data || []);
      } catch (err) {
        if (cancelled) return;
        console.error("[Menu Init Error]:", err);
        setTable(null);
        setTableError(
          err.response?.data?.message || err.message || invalidTableMessage,
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (tableId) {
      initMenu();
    } else {
      setTableError(invalidTableMessage);
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [tableId, invalidTableMessage]);

  useEffect(() => {
    if (!customerName || !customerName.trim()) {
      setCustomerOrderHistory([]);
      setReadyToastVisible(false);
      setReadyToastOrder(null);
      readyOrderIdsRef.current = new Set();
      return;
    }

    const loadCustomerHistory = async () => {
      setHistoryLoading(true);
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
        const mergedHistory = mergeCustomerOrderHistory(
          customerName,
          customerSessionId,
          serverOrders,
          cachedOrders,
        );
        setCustomerOrderHistory(mergedHistory);
      } catch (err) {
        console.error("[Customer History Error]:", err);
        setCustomerOrderHistory(cachedOrders);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadCustomerHistory();
  }, [customerName, customerSessionId]);

  useEffect(() => {
    if (!socket || !customerName || !customerName.trim()) return;

    customerOrderHistory.forEach((order) => {
      if (order?._id) joinOrderRoom(order._id);
    });
  }, [socket, customerOrderHistory, customerName, joinOrderRoom]);

  useEffect(() => {
    if (!socket || !customerName || !customerName.trim()) return;

    const handleStatusUpdate = (updatedOrder) => {
      if (
        updatedOrder?.customerName !== customerName ||
        updatedOrder?.customerSessionId !== customerSessionId ||
        updatedOrder?.status !== "Ready"
      ) {
        return;
      }

      const notifiedOrders = getNotifiedReadyOrders();
      if (
        readyOrderIdsRef.current.has(updatedOrder._id) ||
        notifiedOrders.includes(updatedOrder._id)
      ) {
        return;
      }

      readyOrderIdsRef.current.add(updatedOrder._id);
      markReadyOrderNotified(updatedOrder._id);
      setReadyToastOrder(updatedOrder);
      setReadyToastVisible(true);
      playNotificationSound(
        import.meta.env.VITE_CUSTOMER_NOTIFICATION_SOUND_URL ||
          "/sounds/customer-notification.m4a",
      );

      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("Your order is ready", {
            body: `Order ${updatedOrder.orderNumber} is ready for pickup.`,
            tag: `menu-ready-${updatedOrder._id}`,
            icon: "/favicon-32x32.png",
          });
        } else if (Notification.permission === "default") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              new Notification("Your order is ready", {
                body: `Order ${updatedOrder.orderNumber} is ready for pickup.`,
                tag: `menu-ready-${updatedOrder._id}`,
                icon: "/favicon-32x32.png",
              });
            }
          });
        }
      }

      const timer = window.setTimeout(() => {
        setReadyToastVisible(false);
        setReadyToastOrder(null);
      }, 6000);

      return () => window.clearTimeout(timer);
    };

    socket.on("order_status_updated", handleStatusUpdate);
    return () => {
      socket.off("order_status_updated", handleStatusUpdate);
    };
  }, [socket, customerName, customerSessionId, playNotificationSound]);

  // Filter foods by selected category and search query
  const filteredFoods = foods.filter((food) => {
    const matchesCategory = selectedCategory
      ? food.category?._id === selectedCategory
      : true;
    const nameEn = (food.name?.en || "").toLowerCase();
    const nameAm = (food.name?.am || "").toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query || nameEn.includes(query) || nameAm.includes(query);
    return matchesCategory && matchesSearch;
  });

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0 || !table) return;

    setIsSubmittingOrder(true);
    try {
      const orderPayload = {
        customerName,
        customerSessionId,
        tableId: table._id,
        items: cartItems.map((item) => ({
          foodId: item._id,
          quantity: item.quantity,
        })),
      };

      const res = await createOrderApi(orderPayload);
      if (res.success) {
        saveCustomerOrderToHistory(res.data);
        clearCart();
        setIsCartOpen(false);
        navigate(`/order-confirmation/${res.data._id}`);
      }
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to submit order. Please try again.",
      );
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cafe-50 flex flex-col justify-center">
        <LoadingSpinner message="Scanning table QR code & loading menu..." />
      </div>
    );
  }

  if (tableError) {
    return (
      <div className="min-h-screen bg-cafe-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 shadow">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-cafe-900 mb-2">
          {t("invalid_table_title")}
        </h2>
        <p className="text-sm text-cafe-600 max-w-xs mb-6">{tableError}</p>
      </div>
    );
  }

  const decorativePanelStyle = (imageUrl) => ({
    backgroundImage: `linear-gradient(rgba(110, 71, 42, 0.18), rgba(110, 71, 42, 0.18)), url(${imageUrl})`,
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
  });

  const dismissReadyToast = () => {
    setReadyToastVisible(false);
    setReadyToastOrder(null);
  };

  return (
    <div className="min-h-screen bg-cafe-50 lg:bg-[#f3eee6]">
      <div className="mx-auto flex w-full max-w-[1600px] justify-center">
        <div
          className="pointer-events-none hidden w-[220px] shrink-0 lg:block"
          style={decorativePanelStyle("/images/burger-side.svg")}
        />

        <div className="relative min-h-screen w-full max-w-md border-x border-cafe-200 bg-cafe-50 pb-24 shadow-xl">
          {readyToastVisible && readyToastOrder && (
            <div className="fixed inset-x-4 top-24 z-50 mx-auto max-w-sm rounded-2xl border border-cafe-200 bg-cafe-900 px-4 py-3 text-sm font-bold text-white shadow-xl ring-4 ring-amber-200/40">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-cafe-900">
                    ✓
                  </span>
                  <span className="tracking-[0.12em] uppercase text-[10px] text-amber-200">
                    Ready
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={dismissReadyToast}
                    aria-label="Close notification"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs text-cafe-100 transition hover:bg-white/20"
                  >
                    ×
                  </button>
                </div>
              </div>
              <p className="mt-2 text-base text-white">
                {readyToastOrder.orderNumber}
              </p>
              <p className="mt-1 text-xs text-cafe-200">
                Your order is ready, we will bring you here.
              </p>
            </div>
          )}

          {/* Top Header */}
          <Header />

          {/* Table Badge */}
          <TableHeader table={table} />

          {customerName && (
            <div className="px-4 pt-4">
              <button
                type="button"
                onClick={() => navigate("/my-orders")}
                className="w-full flex items-center justify-between rounded-2xl border border-cafe-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-cafe-300"
              >
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cafe-500">
                    My orders
                  </p>
                  <h3 className="text-sm font-black text-cafe-900">
                    {customerName}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex min-w-7 justify-center rounded-full bg-cafe-900 px-2 py-1 text-[10px] font-black text-white">
                    {historyLoading ? "..." : customerOrderHistory.length}
                  </span>
                  <span className="text-[10px] font-bold text-cafe-600">
                    View all
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Category Pills Filter */}
          <div className="border-b border-cafe-200 bg-cafe-50/80 backdrop-blur">
            {foodCategoryList.length > 0 && (
              <div className="px-4 pt-3 pb-1">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cafe-500">
                  Food
                </div>
                <CategoryFilter
                  categories={foodCategoryList}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />
              </div>
            )}

            {drinkCategoryList.length > 0 && (
              <div className="px-4 py-1 pb-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cafe-500">
                  Drinks
                </div>
                <CategoryFilter
                  categories={drinkCategoryList}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="p-4 bg-cafe-50 sticky top-14 z-20 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-cafe-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search_placeholder")}
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-cafe-200 bg-white text-xs font-medium text-cafe-900 focus:outline-none focus:border-cafe-600 shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-xs text-cafe-400 font-bold"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Food Items List */}
          <div className="px-4 space-y-3">
            {filteredFoods.length === 0 ? (
              <div className="py-12 text-center text-cafe-500">
                <p className="text-sm font-semibold">No food items found.</p>
              </div>
            ) : (
              filteredFoods.map((food) => (
                <FoodCard
                  key={food._id}
                  food={food}
                  onSelectFood={setSelectedFood}
                  onQuickAdd={(item) => addToCart(item, 1)}
                />
              ))
            )}
          </div>

          {/* Food Details Modal */}
          <FoodDetailModal
            food={selectedFood}
            isOpen={!!selectedFood}
            onClose={() => setSelectedFood(null)}
            onAddToCart={addToCart}
          />

          {/* Sticky Floating Bottom Cart Bar */}
          {totalItemsCount > 0 && (
            <div className="fixed bottom-4 left-0 right-0 z-30 px-4 max-w-md mx-auto">
              <button
                onClick={() => setIsCartOpen(true)}
                className="w-full bg-cafe-900 text-white p-3.5 rounded-2xl shadow-xl border border-cafe-700 flex items-center justify-between active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingBag className="w-5 h-5 text-gold-500" />
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                      {totalItemsCount}
                    </span>
                  </div>
                  <span className="font-bold text-xs uppercase tracking-wider text-cafe-200">
                    {t("cart_title")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-white">
                    {formatCurrency(subtotal, currentLang)}
                  </span>
                  <span className="bg-cafe-700 text-cafe-100 text-xs px-2 py-1 rounded-lg font-bold">
                    View
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Cart Drawer */}
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            onPlaceOrder={handlePlaceOrder}
            table={table}
            isSubmitting={isSubmittingOrder}
          />
        </div>

        <div
          className="pointer-events-none hidden w-[220px] shrink-0 lg:block"
          style={decorativePanelStyle("/images/pizza-side.svg")}
        />
      </div>
    </div>
  );
};

export default MenuPage;
