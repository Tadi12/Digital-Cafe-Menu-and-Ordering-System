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

export const forgotPasswordOtpApi = async (email) => {
  const response = await axiosClient.post('/auth/forgot-otp', { email });
  return response.data;
};

export const resetPasswordWithOtpApi = async (email, otp, password) => {
  const response = await axiosClient.post('/auth/reset-with-otp', { email, otp, password });
  return response.data;
};
