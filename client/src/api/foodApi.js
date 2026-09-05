import axiosClient from './axiosClient';

export const getFoodsApi = async (params = {}) => {
  const response = await axiosClient.get('/foods', { params });
  return response.data;
};

export const getFoodByIdApi = async (id) => {
  const response = await axiosClient.get(`/foods/${id}`);
  return response.data;
};

export const createFoodApi = async (formData) => {
  const response = await axiosClient.post('/foods', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const updateFoodApi = async (id, formData) => {
  const response = await axiosClient.put(`/foods/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const toggleFoodAvailabilityApi = async (id) => {
  const response = await axiosClient.patch(`/foods/${id}/toggle-availability`);
  return response.data;
};

export const deleteFoodApi = async (id) => {
  const response = await axiosClient.delete(`/foods/${id}`);
  return response.data;
};
