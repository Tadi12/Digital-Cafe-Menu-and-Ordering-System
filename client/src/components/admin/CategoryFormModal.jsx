import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../common/Modal";
import { Upload, Image as ImageIcon } from "lucide-react";

const CategoryFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  category = null,
  isLoading,
}) => {
  const { t } = useTranslation();

  const [nameEn, setNameEn] = useState("");
  const [nameAm, setNameAm] = useState("");
  const [categoryType, setCategoryType] = useState("food");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (category) {
      setNameEn(category.name?.en || "");
      setNameAm(category.name?.am || "");
      setCategoryType(category.type || "food");
      setImagePreview(category.image?.url || "");
      setImageFile(null);
    } else {
      setNameEn("");
      setNameAm("");
      setCategoryType("food");
      setImageFile(null);
      setImagePreview("");
    }
    setError("");
  }, [category, isOpen]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nameEn.trim() || !nameAm.trim()) {
      setError("Category names in English and Amharic are required.");
      return;
    }

    if (!category && !imageFile) {
      setError("Category image file is required.");
      return;
    }

    const formData = new FormData();
    formData.append("nameEn", nameEn.trim());
    formData.append("nameAm", nameAm.trim());
    formData.append("type", categoryType);
    if (imageFile) {
      formData.append("image", imageFile);
    }

    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? t("edit_category") : t("add_category")}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium border border-red-200">
            {error}
          </div>
        )}

        {/* Image upload */}
        <div>
          <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1">
            {t("category_image")} {!category && "*"}
          </label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-cafe-100 border border-cafe-200 overflow-hidden shrink-0 flex items-center justify-center">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-6 h-6 text-cafe-400" />
              )}
            </div>
            <label className="flex-1 cursor-pointer bg-cafe-50 hover:bg-cafe-100 border-2 border-dashed border-cafe-300 rounded-xl p-2.5 text-center transition-colors">
              <Upload className="w-4 h-4 text-cafe-600 mx-auto mb-0.5" />
              <span className="text-xs font-semibold text-cafe-800 block">
                {t("select_image_file")}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1">
            {t("category_type")} *
          </label>
          <select
            value={categoryType}
            onChange={(e) => setCategoryType(e.target.value)}
            className="form-field"
          >
            <option value="food">{t("food")}</option>
            <option value="drink">{t("drink")}</option>
          </select>
        </div>

        {/* English Name */}
        <div>
          <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1">
            {t("category_name_en")} *
          </label>
          <input
            type="text"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder={t("category_name_en_placeholder")}
            className="form-field"
            required
          />
        </div>

        {/* Amharic Name */}
        <div>
          <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1">
            {t("category_name_am")} *
          </label>
          <input
            type="text"
            value={nameAm}
            onChange={(e) => setNameAm(e.target.value)}
            placeholder="ምሳሌ፡ ቡና እና መጠጥ"
            className="form-field"
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-cafe-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-cafe-700 hover:bg-cafe-100 transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-cafe-800 hover:bg-cafe-900 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            {isLoading
              ? t("saving")
              : category
                ? t("update_category")
                : t("create_category")}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CategoryFormModal;
