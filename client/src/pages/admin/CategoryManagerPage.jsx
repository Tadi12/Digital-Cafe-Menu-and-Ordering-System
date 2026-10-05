import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  getCategoriesApi,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
} from "../../api/categoryApi";
import CategoryFormModal from "../../components/admin/CategoryFormModal";
import ConfirmModal from "../../components/common/ConfirmModal";
import ActionButton from "../../components/common/ActionButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { Plus, Edit2, Trash2, Layers } from "lucide-react";
import { resolveApiError } from '../../utils/apiError';

const CategoryManagerPage = () => {
  const { t } = useTranslation();

  const [categories, setCategories] = useState([]);
  const [categoryTypeFilter, setCategoryTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const deletingIdRef = useRef(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null, name: "" });

  const fetchCategories = async () => {
    try {
      const params =
        categoryTypeFilter === "all" ? {} : { type: categoryTypeFilter };
      const res = await getCategoriesApi(params);
      if (res.success) setCategories(res.data);
    } catch (err) {
      console.error("[Category Fetch Error]:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [categoryTypeFilter]);

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
        // See FoodManagerPage: paint the saved row now, reconcile by refetching.
        // `type` is normalised the same way getCategories does it, otherwise a
        // legacy category with no type set would lose its badge for a frame.
        if (editingCategory && res.data) {
          const saved = { ...res.data, type: res.data.type || "food" };
          setCategories((prev) =>
            prev.map((cat) => (cat._id === saved._id ? { ...cat, ...saved } : cat)),
          );
        }
        fetchCategories();
      } else {
        toast.error(res?.message || t("failed_save_category"));
      }
    } catch (err) {
      toast.error(resolveApiError(err, t, "failed_save_category"));
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteConfirm = (id, name) => {
    setConfirmModal({ isOpen: true, id, name });
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmModal;
    // Ref lock: a second confirm click cannot send a second DELETE.
    if (deletingIdRef.current === id) return;
    deletingIdRef.current = id;
    setDeletingId(id);
    try {
      const res = await deleteCategoryApi(id);
      if (res.success) {
        setCategories((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (err) {
      toast.error(resolveApiError(err, t, "failed_delete"));
    } finally {
      deletingIdRef.current = null;
      setDeletingId((current) => (current === id ? null : current));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-cafe-200 shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <div>
            <h2 className="font-display font-semibold text-cafe-900 text-base">
              {t("category_management")}
            </h2>
           
          </div>
          <select
            value={categoryTypeFilter}
            onChange={(e) => setCategoryTypeFilter(e.target.value)}
            className="ml-auto px-3 py-2 rounded-xl border border-cafe-200 text-xs font-semibold text-cafe-800 bg-white focus:outline-none"
          >
            <option value="all">{t("all_categories_filter")}</option>
            <option value="food">{t("food_categories")}</option>
            <option value="drink">{t("drink_categories")}</option>
          </select>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-cafe-800 hover:bg-cafe-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{t("add_category")}</span>
        </button>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <LoadingSpinner message={t("loading_categories")} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.length === 0 ? (
            <div className="col-span-full py-12 text-center text-cafe-500 font-medium">
              {t("no_categories")}
            </div>
          ) : (
            categories.map((cat) => (
              <div
                key={cat._id}
                className="bg-white rounded-2xl border border-cafe-200 p-4 shadow-sm flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    src={cat.image?.url}
                    alt={cat.name.en}
                    className="w-14 h-14 rounded-xl object-cover bg-cafe-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-cafe-900 break-words leading-snug">
                        {cat.name.en}
                      </h3>
                      <span className="rounded-full bg-cafe-100 text-cafe-700 px-2 py-0.5 text-[10px] font-bold uppercase shrink-0">
                        {cat.type}
                      </span>
                    </div>
                    <p className="text-xs text-cafe-500 font-medium break-words leading-snug mt-0.5">
                      {cat.name.am}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEditModal(cat)}
                    className="p-1.5 rounded-lg text-cafe-600 hover:text-cafe-900 hover:bg-cafe-100 transition-colors"
                    title={t("edit_category")}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <ActionButton
                    onClick={() => openDeleteConfirm(cat._id, cat.name.en)}
                    loading={deletingId === cat._id}
                    icon={Trash2}
                    iconClassName="w-4 h-4 shrink-0"
                    className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title={t("delete_category_title")}
                    aria-label={t("delete_category_title")}
                  />
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title={t("delete_category_title", "Delete Category")}
        message={t("delete_category_confirm", { name: confirmModal.name })}
        confirmText={t("delete", "Delete")}
        isDestructive={true}
      />
    </div>
  );
};

export default CategoryManagerPage;
