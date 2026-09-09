const CUSTOMER_HISTORY_PREFIX = 'cafe_customer_order_history_';

export const normalizeCustomerName = (customerName = '') =>
  String(customerName || '').trim().toLowerCase();

export const getCustomerHistoryKey = (customerName = '') =>
  `${CUSTOMER_HISTORY_PREFIX}${normalizeCustomerName(customerName)}`;

export const readCustomerOrderHistory = (customerName = '') => {
  try {
    const key = getCustomerHistoryKey(customerName);
    const saved = localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const writeCustomerOrderHistory = (customerName, orders = []) => {
  try {
    const key = getCustomerHistoryKey(customerName);
    const sanitized = Array.isArray(orders) ? orders : [];
    localStorage.setItem(key, JSON.stringify(sanitized.slice(0, 25)));
    return sanitized.slice(0, 25);
  } catch {
    return [];
  }
};

export const saveCustomerOrderToHistory = (order) => {
  if (!order?._id || !order.customerName) return [];

  const customerName = order.customerName;
  const previous = readCustomerOrderHistory(customerName);
  const merged = [order, ...previous.filter((item) => item._id !== order._id)]
    .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0))
    .slice(0, 25);

  return writeCustomerOrderHistory(customerName, merged);
};

export const mergeCustomerOrderHistory = (customerName, serverOrders = [], cachedOrders = []) => {
  const combined = [...(cachedOrders || []), ...(serverOrders || [])];
  const map = new Map();

  combined.forEach((order) => {
    if (order?._id) {
      map.set(order._id, order);
    }
  });

  const merged = [...map.values()].sort(
    (a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0),
  );

  writeCustomerOrderHistory(customerName, merged);
  return merged;
};
