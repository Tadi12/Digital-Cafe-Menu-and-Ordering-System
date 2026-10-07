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
 * Preparation track status (as stored) -> translation key.
 *
 * SEPARATE from ORDER_STATUS_KEYS on purpose. A preparation track is stored
 * lower-case ('pending', 'preparing', 'ready') while the overall customer order is
 * stored capitalised ('Pending', 'Preparing', 'Ready'). They used to be looked up in
 * the same table, so every kitchen and waiter label silently resolved to "Unknown",
 * because 'pending' never matched the key 'Pending'.
 *
 * Mirrors the enum in server/models/Order.js.
 */
const PREPARATION_STATUS_KEYS = {
  pending: 'status_pending',
  preparing: 'status_preparing',
  ready: 'status_ready',
  // Legacy value, written before preparation stopped at 'ready'. The server reads
  // it as 'ready' too (normalizeTrackStatus) — see normalizePreparationTrack.
  completed: 'status_ready',
};

/**
 * Interpret a stored track value the same way the server does.
 *
 * A track of 'completed' means the kitchen finished, which is what 'ready' means
 * now. Without this, a legacy order shows the waiter a permanent "waiting for food"
 * message and is never offered the complete action, even though the API reports it
 * as ready.
 *
 * @param {string} status stored track status
 * @returns {'not_required'|'pending'|'preparing'|'ready'}
 */
const normalizePreparationTrack = (status) => {
  if (!status) return 'not_required';
  return status === 'completed' ? 'ready' : status;
};

/** @returns true when one track has nothing left outstanding. */
const isTrackSettled = (value) => {
  const normalized = normalizePreparationTrack(value);
  return normalized === 'not_required' || normalized === 'ready';
};

/**
 * Human copy for a preparation status.
 *
 * 'ready' is the kitchen's finished state and reads as "Ready"; 'not_required'
 * means the order contains none of these items.
 *
 * Normalised BEFORE the 'not_required' test, which is what makes a missing value
 * behave. normalizePreparationTrack maps an absent status to 'not_required', so
 * checking the raw argument first let `undefined` skip past that test, miss the key
 * table entirely and resolve to "Unknown" — on a fresh ticket with no `stationStatus`
 * yet, or on a legacy order written before the split existed. Every station badge
 * read "Unknown" for a brand-new order until the value was normalised first.
 */
export const preparationStatusLabel = (preparationStatus, t) => {
  const normalized = normalizePreparationTrack(preparationStatus);
  if (normalized === 'not_required') return t('preparation_not_required');
  const key = PREPARATION_STATUS_KEYS[normalized];
  return key ? t(key) : t('status_unknown');
};

/**
 * The two preparation tracks, in display order.
 *
 * `itemType` on an order line and the `foodStatus` / `drinkStatus` pair on the
 * order are two views of the same split; this is the order they are listed in.
 */
const PREPARATION_TRACKS = ['food', 'drink'];

/**
 * Which preparation tracks does this order actually contain?
 *
 * An order with no drinks gets `drinkStatus: 'not_required'`, and one with no food
 * gets `foodStatus: 'not_required'`. That value is meaningful to the API — it is how
 * `canCompleteOrder` knows a track owes nothing — but it must never reach the
 * screen. Rendering it puts a caption on a half the order does not have: a
 * food-only order captioned "Drinks: Not required" reads as a status OF the drinks
 * rather than the absence of them, which is noise on every single card.
 *
 * Normalised rather than compared literally, so a legacy order that stored
 * 'completed' (now 'ready') is still recognised as containing that track, and an
 * order missing both track fields yields no tracks at all instead of two phantom
 * ones.
 *
 * This is the single rule for the question, shared by the admin strip in
 * `OrderCard` and the waiter's `PreparationProgress` — the two used to filter
 * differently, which is exactly how a phantom half got onto the admin's screen.
 *
 * @param {{foodStatus?: string, drinkStatus?: string}} order
 * @returns {('food'|'drink')[]} the tracks present, in display order
 */
export const activePreparationTracks = (order) =>
  PREPARATION_TRACKS.filter(
    (track) => normalizePreparationTrack(order?.[`${track}Status`]) !== 'not_required',
  );

/**
 * Is this order closed — served or cancelled?
 *
 * A lifecycle question, and deliberately separate from `canCompleteOrder`, which
 * asks about the preparation tracks. Keeping them apart is the fix for a real bug:
 * `canCompleteOrder` was being used to decide whether to tell the waiter "food and
 * drinks are ready, take this to the table", but it only looks at the two tracks.
 * Those tracks stay 'ready' forever after the order is completed, so a SERVED order
 * kept being announced as ready to carry — the instruction outlived the task.
 *
 * The two answers genuinely differ. A pending order can have both tracks ready and
 * still be open; a completed one has both tracks ready and is closed.
 *
 * @param {string} status the overall order status, as stored
 * @returns {boolean}
 */
export const isOrderClosed = (status) =>
  status === 'Completed' || status === 'Cancelled';

/**
 * The status a kitchen station should DISPLAY for an order.
 *
 * A station's own track stops at 'ready' by design — the kitchen prepares, the
 * floor serves — so `stationStatus` reads 'ready' for the rest of the day. When the
 * waiter or an admin then completes the order, that is the outcome the chef and the
 * barista need to see; otherwise their card insists an order is still waiting to be
 * collected after it has reached the table.
 *
 * Deliberately a read-time projection rather than a write. Folding completion into
 * the track would be wrong three times over: the track records when the FOOD was
 * finished while `status` records when the ORDER was served, and collapsing them
 * loses that distinction; the track flow is specified to terminate at 'ready' and
 * the API refuses anything past it; and a stored 'completed' track is normalised
 * straight back to 'ready' on read, so it would not even display as written.
 *
 * @param {object} order a station-scoped order carrying `status` and `stationStatus`
 * @param {Function} t   i18next `t`
 * @returns {string} translated label
 */
export const stationStatusLabel = (order, t) =>
  isOrderClosed(order?.status)
    ? orderStatusLabel(order.status, t)
    // The `|| 'pending'` matters: a missing stationStatus normalises to
    // 'not_required', which has no label, so without this the helper would report
    // "Unknown" for a fresh ticket — and would disagree with the equivalent
    // fallback in StationDashboard's own statusOf().
    : preparationStatusLabel(order?.stationStatus || 'pending', t);

/**
 * Is this order ready to be served — i.e. does every required track say ready?
 *
 * Mirrors isReadyForCompletion on the server. Used only to decide whether to draw
 * the "Mark Order Completed" button; the API re-checks before writing.
 *
 * Note this says nothing about whether the order is still open — pair it with
 * isOrderClosed() before using it to instruct anybody.
 *
 * @param {{foodStatus?: string, drinkStatus?: string}} tracks
 * @returns {boolean}
 */
export const canCompleteOrder = (tracks = {}) =>
  isTrackSettled(tracks.foodStatus) && isTrackSettled(tracks.drinkStatus);

/**
 * Which half of an order is still waiting on, for the waiter's passive message.
 *
 * @param {{foodStatus?: string, drinkStatus?: string}} tracks
 * @returns {'food'|'drink'|null} null when nothing is outstanding
 */
export const pendingPreparationTrack = (tracks = {}) => {
  if (!isTrackSettled(tracks.foodStatus)) return 'food';
  if (!isTrackSettled(tracks.drinkStatus)) return 'drink';
  return null;
};

export {
  ORDER_STATUS_KEYS,
  ORDER_STATUS_FLOW,
  PREPARATION_FLOW,
  PREPARATION_TRACKS,
  PREPARATION_ACTION_KEYS,
  PREPARATION_STATUS_KEYS,
  normalizePreparationTrack,
};
export default orderStatusLabel;