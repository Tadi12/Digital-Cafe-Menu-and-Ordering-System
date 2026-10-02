import React, { useState, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { LanguageContext } from '../../context/LanguageContext';
import { useFavorites } from '../../hooks/useFavorites';
import Modal from '../common/Modal';
import { formatCurrency } from '../../utils/currencyFormatter';
import { Plus, Minus, ShoppingCart, CheckCircle, XCircle, Heart } from 'lucide-react';

const FoodDetailModal = ({ food, isOpen, onClose, onAddToCart, itemType = "food" }) => {
  const { t } = useTranslation();
  const { currentLang } = useContext(LanguageContext);
  const { isFavorite, toggleFavorite } = useFavorites();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
    }
  }, [isOpen, food]);

  if (!food) return null;

  const name = food.name[currentLang] || food.name.en;
  const ingredientsList = food.ingredients ? food.ingredients[currentLang] || food.ingredients.en : [];
  const isAvailable = food.available;
  const favorited = isFavorite(food._id);

  const handleAdd = () => {
    if (!isAvailable) return;
    onAddToCart(food, quantity);
    onClose();
  };

  const handleToggleFavorite = () => {
    const nowFavorited = toggleFavorite(food);
    toast.success(
      nowFavorited ? t("added_to_favorites") : t("removed_from_favorites"),
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={name} maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Large Food Image */}
        <div className="relative w-full h-56 rounded-xl overflow-hidden bg-cafe-100 shadow-inner dark:bg-recipe-cardHover">
          <img
            src={food.image?.url}
            alt={name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3">
            {isAvailable ? (
              <span className="inline-flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                <CheckCircle className="w-3.5 h-3.5" />
                {t("available")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                <XCircle className="w-3.5 h-3.5" />
                {t("unavailable")}
              </span>
            )}
          </div>

          {/* Favorite Toggle */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-pressed={favorited}
            aria-label={favorited ? t("remove_from_favorite") : t("add_to_favorite")}
            title={favorited ? t("remove_from_favorite") : t("add_to_favorite")}
            className="absolute top-3 right-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/90 shadow-md backdrop-blur transition-transform hover:bg-white active:scale-90 dark:border-recipe-border dark:bg-recipe-pill/90 dark:hover:bg-recipe-pill/90"
          >
            <Heart
              key={String(favorited)}
              className={`h-5 w-5 transition-colors ${
                favorited ? "animate-pop fill-red-500 text-red-500" : "text-cafe-700 dark:text-recipe-text"
              }`}
            />
          </button>
        </div>

        {/* Title & Price */}
        <div className="flex items-start justify-between gap-2 border-b border-cafe-100 pb-3 dark:border-recipe-border">
          <div>
            <h2 className="text-lg font-bold text-cafe-900 leading-snug dark:text-recipe-text">
              {name}
            </h2>
            {food.category?.name && (
              <p className="text-xs text-cafe-500 font-medium dark:text-recipe-muted">
                {food.category.name[currentLang] || food.category.name.en}
              </p>
            )}
          </div>
          <span className="text-lg font-black text-cafe-800 shrink-0 dark:text-amber-400">
            {formatCurrency(food.price, currentLang)}
          </span>
        </div>

        {/* Ingredients Section */}
        {ingredientsList && ingredientsList.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-cafe-700 uppercase tracking-wider mb-1.5 dark:text-recipe-subtle">
              {t("ingredients")}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {ingredientsList.map((ing, idx) => (
                <span
                  key={idx}
                  className="bg-cafe-100 text-cafe-800 text-xs px-2.5 py-1 rounded-md font-medium dark:bg-recipe-pill dark:text-recipe-text"
                >
                  {ing}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quantity Selector & Add Button */}
        {isAvailable ? (
          <div className="pt-3 border-t border-cafe-100 flex items-center justify-between gap-4 dark:border-recipe-border">
            <div className="flex items-center gap-3 bg-cafe-100 rounded-full p-1 border border-cafe-200 dark:border-recipe-border dark:bg-recipe-pill">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-full bg-white text-cafe-800 hover:bg-cafe-200 flex items-center justify-center shadow-sm font-bold active:scale-95 transition-transform dark:bg-recipe-cardHover dark:text-recipe-text dark:hover:bg-recipe-cardHover disabled:opacity-40"
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-6 text-center font-bold text-cafe-900 text-sm dark:text-recipe-text">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-10 h-10 rounded-full bg-white text-cafe-800 hover:bg-cafe-200 flex items-center justify-center shadow-sm font-bold active:scale-95 transition-transform dark:bg-recipe-cardHover dark:text-recipe-text dark:hover:bg-recipe-cardHover"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleAdd}
              className="flex-1 bg-cafe-800 hover:bg-cafe-900 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 dark:bg-recipe-orange dark:text-[#17181c] dark:hover:bg-gold-500"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>
                {t("add_to_cart")} -{" "}
                {formatCurrency(food.price * quantity, currentLang)}
              </span>
            </button>
          </div>
        ) : (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium text-center border border-red-200 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {t(
              itemType === "drink"
                ? "drink_unavailable_message"
                : "food_unavailable_message",
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FoodDetailModal;
