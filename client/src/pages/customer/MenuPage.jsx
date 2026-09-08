import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageContext } from "../../context/LanguageContext";
import { getTableByIdApi } from "../../api/tableApi";
import { getCategoriesApi } from "../../api/categoryApi";
import { getFoodsApi } from "../../api/foodApi";
import { createOrderApi } from "../../api/orderApi";
import { useCart } from "../../hooks/useCart";

import Header from "../../components/common/Header";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import TableHeader from "../../components/customer/TableHeader";
import CategoryFilter from "../../components/customer/CategoryFilter";
import FoodCard from "../../components/customer/FoodCard";
import FoodDetailModal from "../../components/customer/FoodDetailModal";
import CartDrawer from "../../components/customer/CartDrawer";
import { formatCurrency } from "../../utils/currencyFormatter";

import { Search, ShoppingBag, AlertCircle } from "lucide-react";

const MenuPage = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Keep the effect dependency below primitive/stable. The `t` function itself
  // may receive a new reference during a render and would restart menu loading.
  const invalidTableMessage = t("invalid_table_desc");
  const { currentLang } = useContext(LanguageContext);
  const {
    cartItems,
    addToCart,
    clearCart,
    totalItemsCount,
    subtotal,
    customerName,
  } = useCart();

  const [table, setTable] = useState(null);
  const [categories, setCategories] = useState([]);
  const [foods, setFoods] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState(null);

  const categoryList = categories.map((category) => ({
    ...category,
    itemCount: foods.filter((food) => food.category?._id === category._id)
      .length,
  }));

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
        tableId: table._id,
        items: cartItems.map((item) => ({
          foodId: item._id,
          quantity: item.quantity,
        })),
      };

      const res = await createOrderApi(orderPayload);
      if (res.success) {
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

  return (
    <div className="min-h-screen bg-cafe-50 pb-24 max-w-md mx-auto relative shadow-xl border-x border-cafe-200">
      {/* Top Header */}
      <Header />

      {/* Table Badge */}
      <TableHeader table={table} />

      {/* Category Pills Filter */}
      <CategoryFilter
        categories={categoryList}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

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
  );
};

export default MenuPage;
