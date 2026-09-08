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
import FoodFormModal from "../../components/admin/FoodFormModal";
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

const FoodManagerPage = () => {
  const { t } = useTranslation();
  const { currentLang } = useContext(LanguageContext);

  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // New state for availability filter: 'all', 'available', 'unavailable'
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchFoodsAndCategories = async () => {
    try {
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      if (searchQuery) params.search = searchQuery;
      if (availabilityFilter === "available") params.available = "true";
      else if (availabilityFilter === "unavailable") params.available = "false";

      const [foodRes, catRes] = await Promise.all([
        getFoodsApi(params),
        getCategoriesApi({ type: "food" }),
      ]);

      const foodItems = foodRes.success
        ? (foodRes.data || []).filter((food) => food.category?.type === "food")
        : [];

      if (foodRes.success) setFoods(foodItems);
      if (catRes.success) setCategories(catRes.data);
    } catch (err) {
      console.error("[Food Manager Fetch Error]:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoodsAndCategories();
  }, [selectedCategory, searchQuery, availabilityFilter]);

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
        fetchFoodsAndCategories();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save food item.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAvailability = async (id) => {
    try {
      const res = await toggleFoodAvailabilityApi(id);
      if (res.success) {
        setFoods((prev) =>
          prev.map((f) =>
            f._id === id ? { ...f, available: res.data.available } : f,
          ),
        );
      }
    } catch (err) {
      alert("Failed to toggle availability.");
    }
  };

  const handleDeleteFood = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await deleteFoodApi(id);
      if (res.success) {
        setFoods((prev) => prev.filter((f) => f._id !== id));
      }
    } catch (err) {
      alert("Failed to delete food item.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-cafe-200 shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-cafe-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food by name..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-cafe-200 text-xs focus:border-cafe-600 focus:outline-none"
            />
          </div>

          {/* Category Filter dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-cafe-200 text-xs font-semibold text-cafe-800 bg-white focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name.en} ({cat.name.am})
              </option>
            ))}
          </select>
          {/* Availability Filter dropdown */}
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-cafe-200 text-xs font-semibold text-cafe-800 bg-white focus:outline-none ml-2"
          >
            <option value="all">All</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-cafe-800 hover:bg-cafe-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t("add_food")}</span>
        </button>
      </div>

      {/* Foods Table */}
      {loading ? (
        <LoadingSpinner message="Loading food menu items..." />
      ) : (
        <div className="bg-white rounded-2xl border border-cafe-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cafe-50 text-cafe-700 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">Image</th>
                  <th className="p-3">Food Name (EN / AM)</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cafe-100 font-medium text-cafe-800">
                {foods.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="p-8 text-center text-cafe-500 font-medium"
                    >
                      No food items found.
                    </td>
                  </tr>
                ) : (
                  foods.map((food) => (
                    <tr
                      key={food._id}
                      className="hover:bg-cafe-50/50 transition-colors"
                    >
                      <td className="p-3">
                        <img
                          src={food.image.url}
                          alt={food.name.en}
                          className="w-12 h-12 rounded-xl object-cover bg-cafe-100"
                        />
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-cafe-900 block">
                          {food.name.en}
                        </span>
                        <span className="text-cafe-500 text-[11px]">
                          {food.name.am}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-cafe-700">
                        {food.category?.name?.en || "Uncategorized"}
                      </td>
                      <td className="p-3 font-extrabold text-cafe-900">
                        {formatCurrency(food.price, currentLang)}
                      </td>
                      <td className="p-3">
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
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(food)}
                            className="p-1.5 rounded-lg text-cafe-600 hover:text-cafe-900 hover:bg-cafe-100 transition-colors"
                            title="Edit Food"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteFood(food._id, food.name.en)
                            }
                            className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Delete Food"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Food Modal */}
      <FoodFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        categories={categories}
        food={editingFood}
        isLoading={isSaving}
      />
    </div>
  );
};

export default FoodManagerPage;
