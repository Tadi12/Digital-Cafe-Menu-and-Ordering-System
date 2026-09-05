import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '../../context/LanguageContext';
import { formatCurrency } from '../../utils/currencyFormatter';
import { Plus, Info } from 'lucide-react';

const FoodCard = ({ food, onSelectFood, onQuickAdd }) => {
  const { t } = useTranslation();
  const { currentLang } = useContext(LanguageContext);

  const name = food.name[currentLang] || food.name.en;
  const isAvailable = food.available;

  return (
    <div
      onClick={() => onSelectFood(food)}
      className={`bg-white rounded-2xl p-3 border border-cafe-100 shadow-sm hover:shadow-md transition-all flex gap-3 cursor-pointer group relative overflow-hidden ${
        !isAvailable ? 'opacity-60 bg-gray-50' : ''
      }`}
    >
      {/* Food Image */}
      <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-cafe-100 shrink-0">
        <img
          src={food.image?.url}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-1 text-center">
            <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-red-600 px-1.5 py-0.5 rounded">
              {t('unavailable')}
            </span>
          </div>
        )}
      </div>

      {/* Food Content */}
      <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
        <div>
          <h3 className="font-bold text-sm text-cafe-900 line-clamp-1 leading-snug">
            {name}
          </h3>

          {/* Short Ingredients snippet */}
          {food.ingredients && food.ingredients[currentLang] && food.ingredients[currentLang].length > 0 && (
            <p className="text-xs text-cafe-500 line-clamp-1 mt-0.5">
              {food.ingredients[currentLang].join(', ')}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 pt-1 border-t border-cafe-50">
          <span className="font-extrabold text-sm text-cafe-800">
            {formatCurrency(food.price, currentLang)}
          </span>

          {isAvailable ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(food);
              }}
              className="w-8 h-8 rounded-full bg-cafe-700 hover:bg-cafe-800 text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform"
              title={t('add_to_cart')}
            >
              <Plus className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-xs text-red-500 font-medium flex items-center gap-1">
              <Info className="w-3 h-3" />
              {t('unavailable')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FoodCard;
