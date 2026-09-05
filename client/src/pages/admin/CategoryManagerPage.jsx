import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getCategoriesApi,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
} from '../../api/categoryApi';
import CategoryFormModal from '../../components/admin/CategoryFormModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Plus, Edit2, Trash2, Layers } from 'lucide-react';

const CategoryManagerPage = () => {
  const { t } = useTranslation();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await getCategoriesApi();
      if (res.success) setCategories(res.data);
    } catch (err) {
      console.error('[Category Fetch Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    setIsSaving(true);
    try {
      let res;
      if (editingCategory) {
        res = await updateCategoryApi(editingCategory._id, formData);
      } else {
        res = await createCategoryApi(formData);
      }

      if (res.success) {
        setIsModalOpen(false);
        fetchCategories();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save category.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"?`)) return;

    try {
      const res = await deleteCategoryApi(id);
      if (res.success) {
        setCategories((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-cafe-200 shadow-sm">
        <div>
          <h2 className="font-bold text-cafe-900 text-sm">{t('category_management')}</h2>
          <p className="text-xs text-cafe-500">Manage food menu categories and bilingual titles</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-cafe-800 hover:bg-cafe-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{t('add_category')}</span>
        </button>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <LoadingSpinner message="Loading food categories..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.length === 0 ? (
            <div className="col-span-full py-12 text-center text-cafe-500 font-medium">
              No categories created yet.
            </div>
          ) : (
            categories.map((cat) => (
              <div
                key={cat._id}
                className="bg-white rounded-2xl border border-cafe-200 p-4 shadow-sm flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={cat.image?.url}
                    alt={cat.name.en}
                    className="w-14 h-14 rounded-xl object-cover bg-cafe-100 shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-cafe-900 truncate">{cat.name.en}</h3>
                    <p className="text-xs text-cafe-500 font-medium truncate">{cat.name.am}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEditModal(cat)}
                    className="p-1.5 rounded-lg text-cafe-600 hover:text-cafe-900 hover:bg-cafe-100 transition-colors"
                    title="Edit Category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat._id, cat.name.en)}
                    className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Category Modal */}
      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        category={editingCategory}
        isLoading={isSaving}
      />
    </div>
  );
};

export default CategoryManagerPage;
