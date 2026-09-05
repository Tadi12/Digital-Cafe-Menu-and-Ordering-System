import axiosClient from './axiosClient';

export const loginAdminApi = async (credentials) => {
  const response = await axiosClient.post('/auth/login', credentials);
  return response.data;
};

export const getAdminProfileApi = async () => {
  const response = await axiosClient.get('/auth/me');
  return response.data;
};
export const updateAdminProfileApi = async (data) => {
  const response = await axiosClient.put('/auth/me', data);
  return response.data;
};

export const forgotPasswordApi = async (email) => {
  const response = await axiosClient.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPasswordApi = async (token, password) => {
  const response = await axiosClient.post(`/auth/reset-password/${token}`, { password });
  return response.data;
};
