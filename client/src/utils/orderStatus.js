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

/**
 * The admin/kitchen order-status flow, in one place.
 *
 * Each entry owns the *next* status a click will request, the copy shown while
 * that request is in flight, and which roles are allowed to make it. Keeping
 * this beside the label helpers means the buttons, the loading copy and the
 * role rules can never drift apart — the card used to hard-code all three in
 * three separate branches.
 *
 * `waitingKey` is the passive message shown to a role that cannot act yet.
 */
const ORDER_STATUS_FLOW = {
  Pending: {
    next: 'Preparing',
    actionKey: 'start_preparing',
    loadingKey: 'preparing_action_loading',
    successKey: 'status_preparing',
    waitingKey: 'waiting_for_kitchen',
    roles: ['admin', 'super_admin', 'chef'],
    classes: 'bg-gold-500 hover:bg-cafe-900',
  },
  Preparing: {
    next: 'Ready',
    actionKey: 'mark_ready',
    loadingKey: 'marking_ready_loading',
    successKey: 'status_ready',
    waitingKey: 'cooking_in_progress',
    roles: ['admin', 'super_admin', 'chef'],
    classes: 'bg-emerald-600 hover:bg-emerald-700',
  },
  Ready: {
    next: 'Completed',
    actionKey: 'complete_order',
    loadingKey: 'completing_order_loading',
    successKey: 'status_completed',
    waitingKey: 'waiting_for_waiter',
    roles: ['admin', 'super_admin', 'waiter'],
    classes: 'bg-cafe-800 hover:bg-cafe-900',
  },
};

/** @returns the flow step for a status, or undefined when it is terminal. */
export const orderStatusFlow = (status) => ORDER_STATUS_FLOW[status];

/** @returns true when `role` may advance an order that is in `status`. */
export const canAdvanceOrderStatus = (status, role) =>
  Boolean(ORDER_STATUS_FLOW[status]?.roles.includes(role));

export { ORDER_STATUS_KEYS, ORDER_STATUS_FLOW };
export default orderStatusLabel;