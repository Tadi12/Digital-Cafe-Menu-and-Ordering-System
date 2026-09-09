import React, { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { LanguageContext } from "../../context/LanguageContext";
import {
  getFoodsApi,
  createFoodApi,
  updateFoodApi,
  toggleFoodAvailabilityApi,
  deleteFoodApi,
} from "../../api/foodApi";
import { getCategoriesApi } from "../../api/categoryApi";
import DrinkFormModal from "../../components/admin/DrinkFormModal";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { formatCurrency } from "../../utils/currencyFormatter";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const DrinkManagerPage = () => {
  const { t } = useTranslation();
  const { currentLang } = useContext(LanguageContext);

  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const drinkCategories = categories;
  const visibleFoods = foods.filter((food) => {
    const matchesCategory =
      !selectedCategory || food.category?._id === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      (food.name?.en || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (food.name?.am || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" && food.available) ||
      (availabilityFilter === "unavailable" && !food.available);

    return (
      drinkCategories.some((cat) => cat._id === food.category?._id) &&
      matchesCategory &&
      matchesSearch &&
      matchesAvailability
    );
  });

  const fetchDrinksAndCategories = async () => {
    try {
      const [foodRes, catRes] = await Promise.all([
        getFoodsApi(),
        getCategoriesApi({ type: "drink" }),
      ]);

      if (foodRes.success) setFoods(foodRes.data || []);
      if (catRes.success) {
        const drinkCategoryList = (catRes.data || []).filter(
          (category) => category.type === "drink" || !category.type,
        );
        setCategories(drinkCategoryList);
      }
    } catch (err) {
      console.error("[Drink Manager Fetch Error]:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrinksAndCategories();
  }, []);

  const handleOpenAddModal = () => {
    setEditingFood(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (food) => {
    setEditingFood(food);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    setIsSaving(true);
    try {
      let res;
      if (editingFood) {
        res = await updateFoodApi(editingFood._id, formData);
      } else {
        res = await createFoodApi(formData);
      }

      if (res.success) {
        setIsModalOpen(false);
        fetchDrinksAndCategories();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save drink item.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAvailability = async (id) => {
    try {
      const res = await toggleFoodAvailabilityApi(id);
      if (res.success) {
        setFoods((prev) =>
          prev.map((item) =>
            item._id === id ? { ...item, available: res.data.available } : item,
          ),
        );
      }
    } catch (err) {
      alert("Failed to toggle drink availability.");
    }
  };

  const handleDeleteFood = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await deleteFoodApi(id);
      if (res.success) {
        setFoods((prev) => prev.filter((item) => item._id !== id));
      }
    } catch (err) {
      alert("Failed to delete drink item.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-cafe-200 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 w-full md:flex-row md:flex-1 md:items-center">
            <div className="relative w-full md:max-w-xs">
              <Search className="w-4 h-4 text-cafe-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search drinks by name..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-cafe-200 text-xs focus:border-cafe-600 focus:outline-none"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full md:w-auto px-3 py-2 rounded-xl border border-cafe-200 text-xs font-semibold text-cafe-800 bg-white focus:outline-none"
            >
              <option value="">All Drink Categories</option>
              {drinkCategories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name.en} ({cat.name.am})
                </option>
              ))}
            </select>

            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="w-full md:w-auto px-3 py-2 rounded-xl border border-cafe-200 text-xs font-semibold text-cafe-800 bg-white focus:outline-none"
            >
              <option value="all">All</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="bg-cafe-800 hover:bg-cafe-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t("add_drink")}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading drink menu items..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleFoods.length === 0 ? (
            <div className="col-span-full py-12 text-center text-cafe-500 font-medium">
              No drink items found.
            </div>
          ) : (
            visibleFoods.map((food) => (
              <div
                key={food._id}
                className="bg-white rounded-2xl border border-cafe-200 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <img
                    src={food.image?.url}
                    alt={food.name?.en}
                    className="w-16 h-16 rounded-xl object-cover bg-cafe-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-cafe-900 text-sm break-words leading-snug">
                      {food.name?.en}
                    </div>
                    <div className="text-cafe-500 text-[11px] break-words leading-snug mt-0.5">
                      {food.name?.am}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-cafe-600">
                      {food.category?.name?.en || "Uncategorized"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="font-black text-cafe-900">
                    {formatCurrency(food.price, currentLang)}
                  </div>
                  <button
                    onClick={() => handleToggleAvailability(food._id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                      food.available
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "bg-red-100 text-red-800 hover:bg-red-200"
                    }`}
                  >
                    {food.available ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{t("available")}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        <span>{t("unavailable")}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-cafe-100">
                  <button
                    onClick={() => handleOpenEditModal(food)}
                    className="p-1.5 rounded-lg text-cafe-600 hover:text-cafe-900 hover:bg-cafe-100 transition-colors"
                    title="Edit Drink"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFood(food._id, food.name?.en)}
                    className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                    title="Delete Drink"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <DrinkFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        categories={drinkCategories}
        drink={editingFood}
        isLoading={isSaving}
      />
    </div>
  );
};

export default DrinkManagerPage;
