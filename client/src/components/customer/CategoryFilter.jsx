import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '../../context/LanguageContext';
import { Utensils } from 'lucide-react';

const CategoryFilter = ({ categories, selectedCategory, onSelectCategory }) => {
  const { t } = useTranslation();
  const { currentLang } = useContext(LanguageContext);

  return (
    <div className="py-2.5 px-4 overflow-x-auto no-scrollbar flex items-center gap-2 border-b border-cafe-200 bg-cafe-50/80 backdrop-blur">
      <button
        onClick={() => onSelectCategory(null)}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
          selectedCategory === null
            ? 'bg-cafe-800 text-white shadow'
            : 'bg-white text-cafe-700 hover:bg-cafe-100 border border-cafe-200'
        }`}
      >
        <Utensils className="w-3.5 h-3.5" />
        <span>{t('all_categories')}</span>
        <span
          className={`min-w-4 h-4 px-1 text-[10px] rounded-full flex items-center justify-center ${
            selectedCategory === null ? 'bg-white/20 text-white' : 'bg-cafe-100 text-cafe-700'
          }`}
        >
          {categories.reduce((total, category) => total + (category.itemCount || 0), 0)}
        </span>
      </button>

      {categories.map((cat) => {
        const isSelected = selectedCategory === cat._id;
        const name = cat.name[currentLang] || cat.name.en;

        return (
          <button
            key={cat._id}
            onClick={() => onSelectCategory(cat._id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
              isSelected
                ? 'bg-cafe-800 text-white shadow'
                : 'bg-white text-cafe-700 hover:bg-cafe-100 border border-cafe-200'
            }`}
          >
            {cat.image?.url && (
              <img
                src={cat.image.url}
                alt={name}
                className="w-4 h-4 rounded-full object-cover"
              />
            )}
            <span>{name}</span>
            <span
              className={`min-w-4 h-4 px-1 text-[10px] rounded-full flex items-center justify-center ${
                isSelected ? 'bg-white/20 text-white' : 'bg-cafe-100 text-cafe-700'
              }`}
            >
              {cat.itemCount || 0}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default CategoryFilter;
