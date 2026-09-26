import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getFoodsApi } from "../../api/foodApi";
import { useCart } from "../../hooks/useCart";
import { MenuListSkeleton } from "./MenuItemSkeleton";
import FoodCard from "./FoodCard";
import FoodDetailModal from "./FoodDetailModal";
import DrinkDetailModal from "./DrinkDetailModal";
import { Search, SearchX, X } from "lucide-react";

const CustomerSearchOverlay = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { addToCart } = useCart();

  const [mounted, setMounted] = useState(isOpen);
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [selectedDrink, setSelectedDrink] = useState(null);

  const inputRef = useRef(null);

  useEffect(() => {
    let timer;
    if (isOpen) setMounted(true);
    else timer = window.setTimeout(() => setMounted(false), 200);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  // Load the menu on every open so prices and availability stay current.
  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;

    const loadMenu = async () => {
      setLoading(true);
      try {
        const response = await getFoodsApi();
        if (!cancelled && response?.success) setFoods(response.data || []);
      } catch (err) {
        console.error("[Search Overlay Error]:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMenu();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    setQuery("");
    setSelectedFood(null);
    setSelectedDrink(null);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  // Escape closes the overlay, but let the item detail modal handle it first.
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (selectedFood || selectedDrink) return;
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, selectedFood, selectedDrink]);

  if (!mounted) return null;

  const normalizedQuery = query.trim().toLowerCase();

  const results = normalizedQuery
    ? foods.filter((food) => {
        const nameEn = (food.name?.en || "").toLowerCase();
        const nameAm = (food.name?.am || "").toLowerCase();
        const categoryEn = (food.category?.name?.en || "").toLowerCase();
        const categoryAm = (food.category?.name?.am || "").toLowerCase();
        const ingredients = [
          ...(food.ingredients?.en || []),
          ...(food.ingredients?.am || []),
        ]
          .join(" ")
          .toLowerCase();

        return (
          nameEn.includes(normalizedQuery) ||
          nameAm.includes(normalizedQuery) ||
          categoryEn.includes(normalizedQuery) ||
          categoryAm.includes(normalizedQuery) ||
          ingredients.includes(normalizedQuery)
        );
      })
    : foods;

  const handleSelectItem = (item) => {
    if ((item.category?.type || "food") === "drink") {
      setSelectedDrink(item);
      return;
    }

    setSelectedFood(item);
  };

  return (
    <div
      className={`fixed inset-0 z-40 overscroll-contain bg-cafe-50 transition-opacity duration-200 ${
        isOpen ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        className="mx-auto flex h-full w-full max-w-md flex-col border-x border-cafe-200 bg-cafe-50 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Search Header */}
        <div className="border-b border-cafe-200 bg-cafe-50 px-4 py-3 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-cafe-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("search_placeholder")}
              className="w-full rounded-full border border-cafe-200 bg-white py-3 pl-10 pr-12 text-xs font-medium text-cafe-900 shadow-sm focus:border-cafe-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={query ? () => setQuery("") : onClose}
              aria-label={query ? t("clear_search") : t("close_search")}
              title={query ? t("clear_search") : t("close_search")}
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-cafe-500 transition-colors hover:bg-cafe-100 hover:text-cafe-900"
            >
              {query ? (
                <span className="text-base font-bold leading-none">×</span>
              ) : (
                <X className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-cafe-500">
            <span>{t("tab_search")}</span>
            <span>{t("results_count", { total: results.length })}</span>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-28">
          {loading ? (
            <MenuListSkeleton />
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center text-cafe-700">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cafe-100 text-cafe-700">
                <SearchX className="h-6 w-6" />
              </div>
              <h2 className="font-display mb-2 text-lg font-bold text-cafe-900">
                {t("no_menu_matches")}
              </h2>
              <p className="mb-4 max-w-xs text-sm">
                {normalizedQuery
                  ? t("search_no_matches", { query })
                  : t("category_no_matches")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((food, index) => (
                <div
                  key={food._id}
                  className="animate-fadeInUp"
                  style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
                >
                  <FoodCard
                    food={food}
                    onSelectFood={handleSelectItem}
                    onQuickAdd={(item) => addToCart(item, 1)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Item Details Modals */}
        <FoodDetailModal
          food={selectedFood}
          isOpen={!!selectedFood}
          onClose={() => setSelectedFood(null)}
          onAddToCart={addToCart}
        />

        <DrinkDetailModal
          food={selectedDrink}
          isOpen={!!selectedDrink}
          onClose={() => setSelectedDrink(null)}
          onAddToCart={addToCart}
        />
      </div>
    </div>
  );
};

export default CustomerSearchOverlay;
