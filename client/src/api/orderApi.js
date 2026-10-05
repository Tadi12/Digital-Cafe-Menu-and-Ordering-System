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

/**
 * Close the FINAL customer order: `Ready -> Completed`.
 *
 * Reserved for the waiter and the admin. The server refuses a chef or a barista
 * here, and refuses to complete an order while either preparation track is
 * unfinished.
 */
export const updateOrderStatusApi = async (id, statusData) => {
  const response = await axiosClient.patch(`/orders/${id}/status`, statusData);
  return response.data;
};

/**
 * Move ONE preparation track of an order: `pending -> preparing -> ready`.
 *
 * The chef posts to /food-status and the barista to /drink-status. The track comes
 * from the URL on purpose, so the endpoint a caller chose is the one that applies
 * and a crafted body cannot reach the other station. 'completed' is not an
 * accepted value here at all — closing a customer order is the waiter's job.
 */
export const updatePreparationStatusApi = async (id, { track, status }) => {
  const response = await axiosClient.patch(`/orders/${id}/${track}-status`, {
    status,
  });
  return response.data;
};

/**
 * Cancel an order, while it is still Pending.
 *
 * The server requires proof the caller placed it, so the device's customer session
 * id travels with the request. Staff tokens are allowed through without it.
 */
export const cancelOrderApi = async (id, customerSessionId) => {
  const response = await axiosClient.patch(`/orders/${id}/cancel`, { customerSessionId });
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
