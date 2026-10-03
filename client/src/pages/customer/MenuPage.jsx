import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getTableByIdApi, claimTableApi } from "../../api/tableApi";
import { startTableSession } from "../../utils/tableSession";
import { getCategoriesApi } from "../../api/categoryApi";
import { getFoodsApi } from "../../api/foodApi";
import { createOrderApi, getCustomerOrdersApi } from "../../api/orderApi";
import { useCart } from "../../hooks/useCart";
import { useCustomerUI } from "../../hooks/useCustomerUI";
import { useSocket } from "../../hooks/useSocket";

import Header from "../../components/common/Header";
import TableHeader from "../../components/customer/TableHeader";
import CategoryFilter from "../../components/customer/CategoryFilter";
import FoodCard from "../../components/customer/FoodCard";
import { MenuListSkeleton } from "../../components/customer/MenuItemSkeleton";
import FoodDetailModal from "../../components/customer/FoodDetailModal";
import DrinkDetailModal from "../../components/customer/DrinkDetailModal";
import CartDrawer from "../../components/customer/CartDrawer";
import {
  mergeCustomerOrderHistory,
  readCustomerOrderHistory,
  saveCustomerOrderToHistory,
} from "../../utils/customerOrderHistory";
import { SearchX, AlertCircle, RotateCw, Hourglass } from "lucide-react";

const MenuPage = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  // Keep the effect dependency below primitive/stable. The `t` function itself
  // may receive a new reference during a render and would restart menu loading.
  const invalidTableMessage = t("invalid_table_desc");
  const menuFetchFailedMessage = t("menu_fetch_failed");
  const { socket, joinOrderRoom, playNotificationSound } = useSocket();
  const {
    cartItems,
    addToCart,
    clearCart,
    customerName,
    customerSessionId,
  } = useCart();
  const {
    isCartOpen,
    openCart,
    closeCart,
    rememberTableId,
    setIsCustomerNavigationHidden,
  } = useCustomerUI();

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
  const [selectedFood, setSelectedFood] = useState(null);
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [customerOrderHistory, setCustomerOrderHistory] = useState([]);
  const [readyToastVisible, setReadyToastVisible] = useState(false);
  const [readyToastOrder, setReadyToastOrder] = useState(null);

  const getCategoryType = (category) => category?.type || "food";
  const handleSelectItem = (item) => {
    if (getCategoryType(item.category) === "drink") {
      setSelectedDrink(item);
      return;
    }

    setSelectedFood(item);
  };
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
  const [errorKind, setErrorKind] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  useEffect(() => {
    setIsCustomerNavigationHidden(errorKind === "inactive-table" || errorKind === "occupied-table");
    return () => setIsCustomerNavigationHidden(false);
  }, [errorKind, setIsCustomerNavigationHidden]);

  // "Table in use" waiting screen: re-check automatically so the guest gets
  // in as soon as the current occupant leaves, without tapping anything.
  useEffect(() => {
    if (errorKind !== "occupied-table") return undefined;
    const retryTimer = window.setInterval(() => {
      setRetryCount((count) => count + 1);
    }, 20000);
    return () => window.clearInterval(retryTimer);
  }, [errorKind]);

  // Validate table and fetch menu data whenever the QR table id changes
  useEffect(() => {
    let cancelled = false;
    let validatingTable = true;

    const initMenu = async () => {
      setLoading(true);
      setTableError("");
      setErrorKind("");
      try {
        const tableRes = await getTableByIdApi(tableId);
        if (!tableRes.success || !tableRes.data) {
          const error = new Error(tableRes.message || invalidTableMessage);
          error.isInvalidTable = true;
          throw error;
        }
        if (cancelled) return;
        setTable(tableRes.data);
        rememberTableId(tableRes.data._id);

        // Exclusive one-guest-per-table access: claim the table for this
        // customer session before loading the menu. A 409 means another
        // guest is already using it — show the waiting screen instead.
        try {
          await claimTableApi(tableId, customerSessionId);
        } catch (claimErr) {
          if (cancelled) return;
          if (claimErr.response?.status === 409) {
            const occupiedError = new Error(
              claimErr.response?.data?.message || "Table is currently in use.",
            );
            occupiedError.isOccupied = true;
            throw occupiedError;
          }
          throw claimErr;
        }
        if (cancelled) return;

        // Keep the claim alive with heartbeats for as long as this browser
        // stays on the customer pages (survives SPA navigation).
        startTableSession({
          tableId,
          customerSessionId,
          onLost: (lostErr) => {
            const lostInactive =
              lostErr.response?.data?.data?.active === false
                ? lostErr.response.data.data
                : null;
            if (lostInactive) {
              setTable(lostInactive);
              setErrorKind("inactive-table");
              setTableError(lostErr.response?.data?.message);
              return;
            }
            setErrorKind("occupied-table");
            setTableError(
              lostErr.response?.data?.message ||
                "Table is currently in use.",
            );
          },
        });
        validatingTable = false;

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
        const inactiveTable = err.response?.data?.data?.active === false
          ? err.response.data.data
          : null;
        if (inactiveTable) {
          setTable(inactiveTable);
        } else if (!err.isOccupied && err.response?.status !== 409) {
          setTable(null);
        }
        const status = err.response?.status;
        const invalidTable = !inactiveTable && (!!err.isInvalidTable || (validatingTable && [400, 404].includes(status)));
        const occupiedTable =
          !inactiveTable &&
          (err.isOccupied ||
            err.response?.status === 409 ||
            err.response?.data?.code === "TABLE_OCCUPIED");
        setErrorKind(
          occupiedTable
            ? "occupied-table"
            : inactiveTable
              ? "inactive-table"
              : invalidTable
                ? "invalid-table"
                : "network",
        );
        setTableError(
          occupiedTable
            ? err.response?.data?.message || err.message
            : inactiveTable
            ? err.response?.data?.message
            : invalidTable
              ? (err.response?.data?.message || err.message || invalidTableMessage)
              : (err.response?.data?.message || menuFetchFailedMessage),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (tableId) {
      initMenu();
    } else {
      setTableError(invalidTableMessage);
      setErrorKind("invalid-table");
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [tableId, invalidTableMessage, menuFetchFailedMessage, retryCount, rememberTableId, customerSessionId]);

  // The overlay tab bar links here with ?cart=1 when Cart is tapped on another
  // page; open the drawer once the table for this QR code is known.
  useEffect(() => {
    if (!table) return;
    if (searchParams.get("cart") !== "1") return;

    openCart();
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("cart");
    setSearchParams(nextParams, { replace: true });
  }, [table, searchParams, setSearchParams, openCart]);

  useEffect(() => {
    if (!customerName || !customerName.trim()) {
      setCustomerOrderHistory([]);
      setReadyToastVisible(false);
      setReadyToastOrder(null);
      readyOrderIdsRef.current = new Set();
      return;
    }

    const loadCustomerHistory = async () => {
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
            icon: "/notification-icon.png",
          });
        } else if (Notification.permission === "default") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              new Notification("Your order is ready", {
                body: `Order ${updatedOrder.orderNumber} is ready for pickup.`,
                tag: `menu-ready-${updatedOrder._id}`,
                icon: "/notification-icon.png",
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

  // Filter foods by the selected category (search lives in the Search tab overlay)
  const filteredFoods = foods.filter((food) => {
    const matchesCategory = selectedCategory
      ? food.category?._id === selectedCategory
      : true;
    return matchesCategory;
  });

  const handlePlaceOrder = async (selectedPaymentMethod = "Cash") => {
    if (cartItems.length === 0 || !table) return;

    setIsSubmittingOrder(true);
    try {
      const orderPayload = {
        customerName,
        customerSessionId,
        tableId: table._id,
        paymentMethod: selectedPaymentMethod,
        items: cartItems.map((item) => ({
          foodId: item._id,
          quantity: item.quantity,
        })),
      };

      const res = await createOrderApi(orderPayload);
      if (res.success) {
        saveCustomerOrderToHistory(res.data);
        clearCart();
        closeCart();
        navigate(`/order-confirmation/${res.data._id}`);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          t("failed_submit_order"),
      );
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cafe-50 dark:bg-recipe-bg">
        <div className="mx-auto min-h-screen w-full max-w-md border-x border-cafe-200 bg-cafe-50 shadow-xl dark:border-recipe-border dark:bg-recipe-bg">
          <Header />
          <div className="h-20 animate-pulse bg-cafe-100 dark:bg-recipe-card" />
          <div className="space-y-3 border-b border-cafe-200 px-4 py-4 dark:border-recipe-border">
            <div className="flex gap-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-8 w-20 animate-pulse rounded-full bg-cafe-100 dark:bg-recipe-pill" />)}</div>
          </div>
          <div className="p-4"><div className="h-10 animate-pulse rounded-full bg-white shadow-sm dark:bg-recipe-card" /></div>
          <div className="px-4"><MenuListSkeleton /></div>
        </div>
      </div>
    );
  }

  if (tableError) {
    const inactiveTable = errorKind === "inactive-table";
    const occupiedTable = errorKind === "occupied-table";
    return (
      <div className="min-h-screen bg-cafe-50 flex flex-col items-center justify-center p-6 text-center dark:bg-recipe-bg">
        <div className={occupiedTable ? "w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4 shadow dark:bg-amber-500/15 dark:text-amber-400" : "w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 shadow dark:bg-red-500/15 dark:text-red-400"}>
          {occupiedTable ? <Hourglass className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
        </div>
        <h2 className="font-display text-xl font-bold text-cafe-900 mb-2 dark:text-recipe-text">
          {inactiveTable ? t("inactive_table_title") : occupiedTable ? t("occupied_table_title") : errorKind === "invalid-table" ? t("invalid_table_title") : t("menu_network_error_title")}
        </h2>
        <p className="text-sm text-cafe-600 max-w-xs mb-2 dark:text-recipe-muted">
          {occupiedTable
            ? t("occupied_table_desc", { number: table?.tableNumber ?? "?" })
            : inactiveTable
            ? t("inactive_table_desc", { number: table?.tableNumber })
            : errorKind === "invalid-table"
              ? t("invalid_table_friendly")
              : tableError}
        </p>
        {inactiveTable ? null : occupiedTable ? (<><p className="text-xs text-cafe-600 max-w-xs mb-3 dark:text-recipe-muted">{t("occupied_table_hint")}</p><button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white hover:bg-amber-700"><RotateCw className="h-4 w-4" />{t("try_again")}</button></>) : errorKind === "invalid-table" ? <p className="text-xs text-cafe-600 max-w-xs mb-6 dark:text-recipe-muted">{t("rescan_qr_hint")}</p> : <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cafe-800 px-5 py-3 text-sm font-bold text-white hover:bg-cafe-900 dark:bg-recipe-orange dark:text-[#17181c] dark:hover:bg-gold-500"><RotateCw className="h-4 w-4" />{t("retry")}</button>}
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
    <div className="min-h-screen bg-cafe-50 lg:bg-[#f3eee6] dark:bg-recipe-bg dark:lg:bg-recipe-bg">
      <div className="mx-auto flex w-full max-w-[1600px] justify-center">
        <div
          className="pointer-events-none hidden w-[220px] shrink-0 lg:block dark:opacity-30 dark:saturate-50"
          style={decorativePanelStyle("/images/burger-side.svg")}
        />

        <div className="relative min-h-screen w-full max-w-md border-x border-cafe-200 bg-cafe-50 pb-28 shadow-xl dark:border-recipe-border dark:bg-recipe-bg">
          {readyToastVisible && readyToastOrder && (
            <div className="fixed inset-x-4 top-24 z-50 mx-auto max-w-sm rounded-2xl border border-cafe-200 bg-cafe-900 px-4 py-3 text-sm font-bold text-white shadow-xl ring-4 ring-amber-200/40 dark:border-recipe-border dark:bg-recipe-card dark:ring-recipe-orange/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-cafe-900 dark:bg-recipe-orange dark:text-[#17181c]">
                    ✓
                  </span>
                  <span className="tracking-[0.12em] uppercase text-[10px] text-amber-200">
                    {t('ready')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={dismissReadyToast}
                    aria-label={t('close_notification')}
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
                {t('order_ready_bring_here')}
              </p>
            </div>
          )}

          {/* Top Header */}
          <Header />

          {/* Table Badge */}
          <TableHeader table={table} />

          {/* Category Pills Filter */}
          <div className="border-b border-cafe-200 bg-cafe-50/80 backdrop-blur dark:border-recipe-border dark:bg-recipe-bg/90">
            {foodCategoryList.length > 0 && (
              <div className="px-4 pt-3 pb-1">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cafe-500 dark:text-recipe-subtle">
                  {t('food')}
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
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cafe-500 dark:text-recipe-subtle">
                  {t('drinks')}
                </div>
                <CategoryFilter
                  categories={drinkCategoryList}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />
              </div>
            )}
          </div>

          {/* Food Items List */}
          <div className="px-4 space-y-3">
            {filteredFoods.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center text-cafe-700 dark:text-recipe-muted">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cafe-100 text-cafe-700 dark:bg-recipe-cardHover dark:text-recipe-muted"><SearchX className="h-6 w-6" /></div>
                <h2 className="font-display mb-2 text-lg font-bold text-cafe-900 dark:text-recipe-text">{t("no_menu_matches")}</h2>
                <p className="mb-4 max-w-xs text-sm">{t("category_no_matches")}</p>
                {selectedCategory && <button type="button" onClick={() => setSelectedCategory(null)} className="rounded-xl border border-cafe-300 px-4 py-2 text-sm font-bold text-cafe-800 hover:bg-cafe-100 dark:border-recipe-border dark:bg-recipe-pill dark:text-recipe-text dark:hover:bg-recipe-pill">{t("clear_filters")}</button>}
              </div>
            ) : (
              filteredFoods.map((food, index) => (
                <div key={food._id} className="animate-fadeInUp" style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}>
                  <FoodCard
                    food={food}
                    onSelectFood={handleSelectItem}
                    onQuickAdd={(item) => addToCart(item, 1)}
                  />
                </div>
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

          {/* Drink Details Modal */}
          <DrinkDetailModal
            food={selectedDrink}
            isOpen={!!selectedDrink}
            onClose={() => setSelectedDrink(null)}
            onAddToCart={addToCart}
          />

          {/* Cart Drawer */}
          <CartDrawer
            isOpen={isCartOpen}
            onClose={closeCart}
            onPlaceOrder={handlePlaceOrder}
            table={table}
            isSubmitting={isSubmittingOrder}
          />
        </div>

        <div
          className="pointer-events-none hidden w-[220px] shrink-0 lg:block dark:opacity-30 dark:saturate-50"
          style={decorativePanelStyle("/images/pizza-side.svg")}
        />
      </div>
    </div>
  );
};

export default MenuPage;
