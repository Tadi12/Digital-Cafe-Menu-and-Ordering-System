import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getFoodsApi } from "../../api/foodApi";
import { useCart } from "../../hooks/useCart";
import { useFavorites } from "../../hooks/useFavorites";
import Header from "../../components/common/Header";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import FoodCard from "../../components/customer/FoodCard";
import FoodDetailModal from "../../components/customer/FoodDetailModal";
import DrinkDetailModal from "../../components/customer/DrinkDetailModal";
import { ArrowLeft, Heart } from "lucide-react";

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const { favoriteItems, removeFavorite, replaceFavorites } = useFavorites();

  const [loading, setLoading] = useState(true);
  const [selectedFood, setSelectedFood] = useState(null);
  const [selectedDrink, setSelectedDrink] = useState(null);

  // The mount-time list is used to refresh the saved snapshots against the live
  // menu, so keep it in a ref to avoid re-running the request on every change.
  const favoriteItemsRef = useRef(favoriteItems);
  useEffect(() => {
    favoriteItemsRef.current = favoriteItems;
  }, [favoriteItems]);

  useEffect(() => {
    let cancelled = false;

    const loadFavorites = async () => {
      setLoading(true);
      const savedFavorites = favoriteItemsRef.current;

      try {
        const response = await getFoodsApi();

        // Only refresh against the live menu when the menu actually loaded,
        // otherwise a failed response would wipe the saved list.
        if (response?.success) {
          const liveItems = response.data || [];
          const liveById = new Map(liveItems.map((item) => [item._id, item]));

          // Refresh price/availability and drop items that left the menu.
          const refreshed = savedFavorites
            .filter((favorite) => liveById.has(favorite._id))
            .map((favorite) => ({
              ...liveById.get(favorite._id),
              favoritedAt: favorite.favoritedAt,
            }));

          if (!cancelled) replaceFavorites(refreshed);
        }
      } catch (err) {
        // Offline fallback: keep showing the saved snapshots.
        console.error("[Favorites Error]:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [replaceFavorites]);

  const getCategoryType = (category) => category?.type || "food";

  const handleSelectItem = (item) => {
    if (getCategoryType(item.category) === "drink") {
      setSelectedDrink(item);
      return;
    }

    setSelectedFood(item);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cafe-50 flex flex-col justify-center">
        <LoadingSpinner message={t("loading_favorites")} />
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
          {t("back")}
        </button>
        <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
          <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
          {t("favorites")}
        </div>
      </div>

      <div className="flex-1 p-4 pb-28 space-y-4">
        <div className="bg-white rounded-2xl border border-cafe-200 p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-cafe-700">
            <Heart className="w-4 h-4 shrink-0 fill-red-500 text-red-500" />
            <span className="text-sm font-bold">
              {t("favorite_items_count", { total: favoriteItems.length })}
            </span>
          </div>
          <p className="text-[11px] text-cafe-500">
            {t("favorites_local_notice")}
          </p>
        </div>

        {favoriteItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-cafe-200 p-6 text-center space-y-3">
            <Heart className="mx-auto h-10 w-10 text-cafe-300" />
            <p className="text-sm text-cafe-600">{t("no_favorites")}</p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-xl bg-cafe-800 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cafe-900"
            >
              {t("browse_menu")}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {favoriteItems.map((item, index) => (
              <div
                key={item._id}
                className="animate-fadeInUp relative"
                style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
              >
                <FoodCard
                  food={item}
                  onSelectFood={handleSelectItem}
                  onQuickAdd={(favorite) => addToCart(favorite, 1)}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFavorite(item._id);
                  }}
                  aria-label={t("remove_from_favorite")}
                  title={t("remove_from_favorite")}
                  className="absolute -top-2 -right-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-cafe-200 bg-white shadow-md transition-transform hover:bg-cafe-50 active:scale-90"
                >
                  <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                </button>
              </div>
            ))}
          </div>
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
    </div>
  );
};

export default FavoritesPage;
