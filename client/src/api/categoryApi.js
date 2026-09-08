import axiosClient from './axiosClient';

export const getCategoriesApi = async (params = {}) => {
  const response = await axiosClient.get('/categories', { params });
  return response.data;
};

export const createCategoryApi = async (formData) => {
  const response = await axiosClient.post('/categories', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const updateCategoryApi = async (id, formData) => {
  const response = await axiosClient.put(`/categories/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteCategoryApi = async (id) => {
  const response = await axiosClient.delete(`/categories/${id}`);
  return response.data;
};
