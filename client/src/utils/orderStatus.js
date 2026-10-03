/**
 * Single place that turns the stored order/payment enum values into translated
 * text.
 *
 * The API stores statuses as English enum strings ('Pending', 'Ready', ...).
 * They are identifiers, not copy, so they must never be rendered directly —
 * doing so left the order filter tabs and the admin order cards showing
 * English on an Amharic screen. Every dashboard routes through these helpers.
 */

/** Order status (as stored) -> translation key. */
const ORDER_STATUS_KEYS = {
  Pending: 'status_pending',
  Preparing: 'status_preparing',
  Ready: 'status_ready',
  Completed: 'status_completed',
  Cancelled: 'status_cancelled',
  // Filter-only value, not an order status.
  All: 'status_all',
};

/** @returns translated label for an order status. */
export const orderStatusLabel = (status, t) => {
  const key = ORDER_STATUS_KEYS[status];
  return key ? t(key) : t('status_unknown');
};

/** Payment status (as stored) -> translation key. */
const PAYMENT_STATUS_KEYS = {
  Paid: 'payment_paid',
  Unpaid: 'payment_unpaid',
};

/** @returns translated label for a payment status, or the raw value if unknown. */
export const paymentStatusLabel = (status, t) => {
  const key = PAYMENT_STATUS_KEYS[status];
  return key ? t(key) : status || '';
};

// Mobile-money and bank names (Telebirr, CBE, Dashen, Awash, BOA, Zemen) are
// brands and stay as-is; only 'Cash' needs a translated word.
const PAYMENT_METHOD_KEYS = {
  Cash: 'payment_method_cash',
};

/** @returns translated label for a payment method, or the raw value if unknown. */
export const paymentMethodLabel = (method, t) => {
  if (!method) return '';
  const key = PAYMENT_METHOD_KEYS[method];
  return key ? t(key) : method;
};

export { ORDER_STATUS_KEYS };
export default orderStatusLabel;