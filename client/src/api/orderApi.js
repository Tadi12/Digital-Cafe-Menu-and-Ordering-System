import axiosClient from './axiosClient';

export const createOrderApi = async (orderData) => {
  const response = await axiosClient.post('/orders', orderData);
  return response.data;
};

export const getOrdersApi = async (params = {}) => {
  const response = await axiosClient.get('/orders', { params });
  return response.data;
};

export const getOrderByIdApi = async (id) => {
  const response = await axiosClient.get(`/orders/${id}`);
  return response.data;
};

export const getCustomerOrdersApi = async ({ customerName, customerSessionId } = {}) => {
  const response = await axiosClient.get('/orders/customer', {
    params: { customerName, customerSessionId },
  });
  return response.data;
};

export const updateOrderStatusApi = async (id, statusData) => {
  const response = await axiosClient.patch(`/orders/${id}/status`, statusData);
  return response.data;
};

export const cancelOrderApi = async (id) => {
  const response = await axiosClient.patch(`/orders/${id}/cancel`);
  return response.data;
};
