import axiosClient from './axiosClient';

export const getDashboardMetricsApi = async () => {
  const response = await axiosClient.get('/analytics/dashboard');
  return response.data;
};

export const getRevenueAnalyticsApi = async (days = 7) => {
  const response = await axiosClient.get(`/analytics/revenue?days=${days}`);
  return response.data;
};

export const getPopularFoodsAnalyticsApi = async () => {
  const response = await axiosClient.get('/analytics/popular-foods');
  return response.data;
};
