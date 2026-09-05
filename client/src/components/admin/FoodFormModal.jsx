import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import { Upload, Image as ImageIcon } from 'lucide-react';

const FoodFormModal = ({ isOpen, onClose, onSubmit, categories, food = null, isLoading }) => {
  const { t } = useTranslation();

  const [nameEn, setNameEn] = useState('');
  const [nameAm, setNameAm] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [ingredientsEn, setIngredientsEn] = useState('');
  const [ingredientsAm, setIngredientsAm] = useState('');
  const [available, setAvailable] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (food) {
      setNameEn(food.name?.en || '');
      setNameAm(food.name?.am || '');
      setPrice(food.price || '');
      setCategory(food.category?._id || food.category || '');
      setIngredientsEn(food.ingredients?.en?.join(', ') || '');
      setIngredientsAm(food.ingredients?.am?.join(', ') || '');
      setAvailable(food.available !== undefined ? food.available : true);
      setImagePreview(food.image?.url || '');
      setImageFile(null);
    } else {
      setNameEn('');
      setNameAm('');
      setPrice('');
      setCategory(categories[0]?._id || '');
      setIngredientsEn('');
      setIngredientsAm('');
      setAvailable(true);
      setImageFile(null);
      setImagePreview('');
    }
    setError('');
  }, [food, isOpen, categories]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nameEn.trim() || !nameAm.trim() || !price || !category) {
      setError('Name (EN & AM), Price, and Category are required.');
      return;
    }

    if (Number(price) <= 0) {
      setError('Price must be a positive number.');
      return;
    }

    if (!food && !imageFile) {
      setError('Food image file is required.');
      return;
    }

    const formData = new FormData();
    formData.append('nameEn', nameEn.trim());
    formData.append('nameAm', nameAm.trim());
    formData.append('price', price);
    formData.append('category', category);
    formData.append('ingredientsEn', ingredientsEn);
    formData.append('ingredientsAm', ingredientsAm);
    formData.append('available', available);

    if (imageFile) {
      formData.append('image', imageFile);
    }

    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={food ? t('edit_food') : t('add_food')}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium border border-red-200">
            {error}
          </div>
        )}

        {/* Image upload dropzone */}
        <div>
          <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1">
            {t('upload_image')} {!food && '*'}
          </label>
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-xl bg-cafe-100 border border-cafe-200 overflow-hidden shrink-0 flex items-center justify-center">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-cafe-400" />
              )}
            </div>
            <label className="flex-1 cursor-pointer bg-cafe-50 hover:bg-cafe-100 border-2 border-dashed border-cafe-300 rounded-xl p-3 text-center transition-colors">
              <Upload className="w-5 h-5 text-cafe-600 mx-auto mb-1" />
              <span className="text-xs font-semibold text-cafe-800 block">Choose image file</span>
              <span className="text-[10px] text-cafe-500">JPG, PNG, WEBP max 5MB</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Bilingual Names */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1">
              {t('food_name_en')} *
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Chicken Burger"
              className="w-full px-3 py-2 rounded-xl border border-cafe-200 text-sm focus:border-cafe-600 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1">
              {t('food_name_am')} *
            </label>
            <input
              type="text"
              value={nameAm}
              onChange={(e) => setNameAm(e.target.value)}
              placeholder="ምሳሌ፡ የዶሮ በርገር"
              className="w-full px-3 py-2 rounded-xl border border-cafe-200 text-sm focus:border-cafe-600 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Price & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1">
              {t('price')} (ETB) *
            </label>
            <input
              type="number"
              min="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="250"
              className="w-full px-3 py-2 rounded-xl border border-cafe-200 text-sm focus:border-cafe-600 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1">
              {t('category')} *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-cafe-200 text-sm focus:border-cafe-600 focus:outline-none bg-white"
              required
            >
              <option value="" disabled>Select category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name.en} ({cat.name.am})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ingredients (Comma separated) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1">
              Ingredients (English, comma separated)
            </label>
            <input
              type="text"
              value={ingredientsEn}
              onChange={(e) => setIngredientsEn(e.target.value)}
              placeholder="Chicken, Cheese, Mayo"
              className="w-full px-3 py-2 rounded-xl border border-cafe-200 text-sm focus:border-cafe-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1">
              Ingredients (Amharic, comma separated)
            </label>
            <input
              type="text"
              value={ingredientsAm}
              onChange={(e) => setIngredientsAm(e.target.value)}
              placeholder="ዶሮ, አይብ, ማዮኔዝ"
              className="w-full px-3 py-2 rounded-xl border border-cafe-200 text-sm focus:border-cafe-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="flex items-center justify-between p-3 bg-cafe-50 rounded-xl border border-cafe-200">
          <div>
            <span className="font-bold text-xs text-cafe-900 block">Item Availability Status</span>
            <span className="text-[11px] text-cafe-500">Toggle whether customers can order this item</span>
          </div>
          <button
            type="button"
            onClick={() => setAvailable(!available)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              available ? 'bg-emerald-600' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                available ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-cafe-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-cafe-700 hover:bg-cafe-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-cafe-800 hover:bg-cafe-900 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : food ? 'Update Food' : 'Create Food'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default FoodFormModal;
