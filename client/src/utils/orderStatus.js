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
 * The FINAL customer order status flow, in one place.
 *
 * This is the overall order, not a preparation track. Preparation moves on its own
 * tracks (PREPARATION_FLOW, driven by the chef and the barista); this flow is the
 * floor's: getting an order onto the table and closing it.
 *
 * The chef and the barista are absent from every `roles` list. They used to appear
 * here for the Preparing/Ready steps, back when one field covered both jobs; now
 * that preparation has its own endpoint the API answers 403 to them here, so
 * offering the button would only produce a guaranteed failure.
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
    roles: ['admin', 'super_admin'],
    classes: 'bg-gold-500 hover:bg-cafe-900',
  },
  Preparing: {
    next: 'Ready',
    actionKey: 'mark_ready',
    loadingKey: 'marking_ready_loading',
    successKey: 'status_ready',
    waitingKey: 'cooking_in_progress',
    roles: ['admin', 'super_admin'],
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

/**
 * The per-station preparation flow, in one place.
 *
 * Preparation is pending -> preparing -> ready and STOPS there. There is
 * deliberately no `ready` entry: the kitchen's job ends at ready, so a chef or a
 * barista is never offered a "complete" action. Closing the customer order is a
 * separate, floor-side action — see ORDER_STATUS_FLOW.
 *
 * Mirrors TRACK_TRANSITIONS in server/utils/orderStatus.js, which is what the API
 * actually enforces. This copy exists so the button can label itself, but the
 * server is the authority: an out-of-order or over-reaching click is refused
 * there, not here.
 */
const PREPARATION_FLOW = {
  pending: {
    next: 'preparing',
    actionKey: 'start_preparing',
    loadingKey: 'preparing_action_loading',
    successKey: 'status_preparing',
    classes: 'bg-gold-500 hover:bg-cafe-900',
  },
  preparing: {
    next: 'ready',
    loadingKey: 'marking_ready_loading',
    successKey: 'status_ready',
    classes: 'bg-emerald-600 hover:bg-emerald-700',
  },
};

/**
 * Button copy per track, so the chef reads "Mark Food Ready" and the barista reads
 * "Mark Drink Ready" rather than both seeing the same ambiguous wording.
 */
const PREPARATION_ACTION_KEYS = {
  food: {
    pending: 'start_preparing',
    preparing: 'mark_food_ready',
  },
  drink: {
    pending: 'start_preparing',
    preparing: 'mark_drink_ready',
  },
};

/** @returns the flow step for a preparation status, or undefined when terminal. */
export const preparationFlow = (preparationStatus) => PREPARATION_FLOW[preparationStatus];

/**
 * Human copy for a preparation status.
 *
 * 'ready' is the kitchen's finished state and reads as "Ready"; 'not_required'
 * means the order contains none of these items.
 */
export const preparationStatusLabel = (preparationStatus, t) => {
  if (preparationStatus === 'not_required') return t('preparation_not_required');
  const key = ORDER_STATUS_KEYS[preparationStatus];
  return key ? t(key) : t('status_unknown');
};

/**
 * Is this order ready to be served — i.e. does every required track say ready?
 *
 * Mirrors isReadyForCompletion on the server. Used only to decide whether to draw
 * the "Mark Order Completed" button; the API re-checks before writing.
 *
 * @param {{foodStatus?: string, drinkStatus?: string}} tracks
 * @returns {boolean}
 */
export const canCompleteOrder = (tracks = {}) => {
  const done = (value) => value === 'not_required' || value === 'ready';
  return done(tracks.foodStatus) && done(tracks.drinkStatus);
};

/**
 * Which half an order is still waiting on, for the waiter's passive message.
 *
 * @param {{foodStatus?: string, drinkStatus?: string}} tracks
 * @returns {'food'|'drink'|null} null when nothing is outstanding
 */
export const pendingPreparationTrack = (tracks = {}) => {
  if (tracks.foodStatus !== 'not_required' && tracks.foodStatus !== 'ready') return 'food';
  if (tracks.drinkStatus !== 'not_required' && tracks.drinkStatus !== 'ready') return 'drink';
  return null;
};

export {
  ORDER_STATUS_KEYS,
  ORDER_STATUS_FLOW,
  PREPARATION_FLOW,
  PREPARATION_ACTION_KEYS,
};
export default orderStatusLabel;