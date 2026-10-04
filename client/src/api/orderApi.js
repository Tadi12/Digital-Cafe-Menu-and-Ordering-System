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

/**
 * Move ONE preparation track of an order (food for the chef, drink for the
 * barista). Separate from updateOrderStatusApi, which still sets the single
 * overall status the admin and the waiter use.
 */
export const updatePreparationStatusApi = async (id, { track, status }) => {
  const response = await axiosClient.patch(`/orders/${id}/preparation`, { track, status });
  return response.data;
};

export const cancelOrderApi = async (id) => {
  const response = await axiosClient.patch(`/orders/${id}/cancel`);
  return response.data;
};

// --- Waiter station --------------------------------------------------------

/**
 * The tables assigned to the signed-in waiter, each with live order counts.
 * Returns 403 if the caller is not staff, so the UI can treat a failure as
 * "not your station" rather than "empty".
 */
export const getMyTablesApi = async () => {
  const response = await axiosClient.get('/orders/waiter/tables');
  return response.data;
};

/**
 * Orders on one table. The API verifies the table belongs to the caller and
 * answers 403 otherwise — the frontend never has to check ownership itself.
 */
export const getTableOrdersApi = async (tableId) => {
  const response = await axiosClient.get(`/orders/waiter/tables/${tableId}/orders`);
  return response.data;
};
