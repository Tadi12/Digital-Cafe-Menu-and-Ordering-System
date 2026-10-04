/**
 * Single source of truth for the food / drink preparation split and for who may
 * move what.
 *
 * A customer order stays ONE document with TWO independent preparation tracks
 * inside it, plus ONE final customer-facing status:
 *
 *   foodStatus   pending -> preparing -> ready      (chef)
 *   drinkStatus  pending -> preparing -> ready      (barista)
 *   status       the final order: ... -> Ready -> Completed   (waiter / admin)
 *
 * The important rule this module exists to enforce: `completed` is a FINAL CUSTOMER
 * ORDER state, not a preparation state. A chef's or a barista's job ends at
 * 'ready'. They can never close a customer order, and they can never reach a value
 * that would read as one.
 *
 * `status` is DERIVED from the two tracks while the order is being prepared, so
 * the two can never disagree with each other or overwrite each other's work.
 * `Completed` is the single exception: it is set explicitly by a waiter or an admin
 * once both tracks are ready, and is never produced by this module.
 *
 * This affects preparation and workflow only. `totalAmount`, the payment fields
 * and the order number are untouched: splitting an order by kitchen never splits
 * its money.
 */

/** The two preparation tracks. */
const TRACKS = ['food', 'drink'];

/**
 * Values a track can hold.
 *
 * 'not_required' means the order contains none of these items.
 *
 * 'completed' is RETAINED for documents written before this rule existed (a chef
 * could once press "complete" on a track). It is accepted on read so those orders
 * still load, but it is no longer writable and is normalised to 'ready' everywhere
 * it is interpreted — see `normalizeTrackStatus`.
 */
const TRACK_STATUSES = ['not_required', 'pending', 'preparing', 'ready', 'completed'];

/**
 * Statuses a chef or barista may REQUEST.
 *
 * Note what is absent: 'completed'. Preparation ends at 'ready', so the one thing
 * that would let a kitchen user close a customer order is not even a valid input.
 */
const ACTIONABLE_TRACK_STATUSES = ['pending', 'preparing', 'ready'];

/** The one final status a waiter or admin may set explicitly. */
const FINAL_STATUSES = ['Completed'];

/**
 * Which track each preparation role owns.
 * Admin/super_admin are absent on purpose: they may drive either track, which is
 * handled by `mayUpdateTrack` below rather than by a fixed owner.
 */
const ROLE_TRACK = {
  chef: 'food',
  barista: 'drink',
};

/** Roles that may act on any track. */
const OVERSEER_ROLES = ['admin', 'super_admin'];

/**
 * Roles that may set the FINAL customer order status.
 *
 * The chef and the barista are deliberately excluded: completing an order means
 * serving it, which is a floor job. `maySetFinalStatus` is what turns that into a
 * 403 rather than a hidden button.
 */
const FINAL_STATUS_ROLES = ['admin', 'super_admin', 'waiter'];

/**
 * Forward-only transitions within a single track.
 *
 * 'ready' has NO outgoing transition: preparation is finished there and the next
 * move belongs to the waiter, not the kitchen. 'not_required' is absent entirely,
 * so a track that was not required when the order was placed can never be started.
 */
const TRACK_TRANSITIONS = {
  pending: ['preparing'],
  preparing: ['ready'],
  ready: [],
  // Legacy value: readable, never written, never advanced.
  completed: [],
};

/** Ordering used to fold two tracks into one overall status. */
const TRACK_PROGRESS = {
  not_required: -1,
  pending: 0,
  preparing: 1,
  ready: 2,
};

/** Overall status produced when the slowest required track has reached a level. */
const PROGRESS_TO_OVERALL = {
  0: 'Pending',
  1: 'Preparing',
  2: 'Ready',
};

/** Reverse lookups for syncTracksToOverall: the track level an overall status implies. */
const OVERALL_TO_TRACK = {
  Pending: 'pending',
  Preparing: 'preparing',
  Ready: 'ready',
};

const TRACK_STATUS_BY_PROGRESS = {
  0: 'pending',
  1: 'preparing',
  2: 'ready',
};

/**
 * Interpret a stored track value.
 *
 * A legacy 'completed' track means the kitchen finished, which is what 'ready'
 * means now, so it is read as 'ready'. Without this, an order prepared before the
 * rule changed would silently report itself as a completed customer order.
 *
 * @param {string} status stored track status
 * @returns {'not_required'|'pending'|'preparing'|'ready'}
 */
const normalizeTrackStatus = (status) => {
  if (!status) return 'not_required';
  return status === 'completed' ? 'ready' : status;
};

/**
 * Seed both tracks from the items on a brand new order.
 *
 * An order with only drinks gets foodStatus 'not_required' rather than 'pending',
 * which is what lets the overall status reach Ready without waiting on a chef who
 * has nothing to cook.
 *
 * @param {Array<{itemType?: string}>} items order item snapshots
 * @returns {{foodStatus: string, drinkStatus: string}}
 */
const initialTrackStatuses = (items = []) => {
  const has = (type) => items.some((item) => (item.itemType || 'food') === type);

  return {
    foodStatus: has('food') ? 'pending' : 'not_required',
    drinkStatus: has('drink') ? 'pending' : 'not_required',
  };
};

/**
 * Fold the two preparation tracks into the single overall order status.
 *
 * The slowest track that is actually required wins, so the customer is never told
 * an order is Ready while one half of it is still being made:
 *
 *   food preparing  / drink ready          -> Preparing
 *   food ready      / drink ready          -> Ready
 *   food completed  / drink not_required   -> Completed
 *
 * Both tracks 'not_required' cannot happen for a real order (it must contain at
 * least one item) but degrades to 'Pending' rather than throwing.
 *
 * @param {{foodStatus?: string, drinkStatus?: string}} tracks
 * @returns {'Pending'|'Preparing'|'Ready'|'Completed'}
 */
const deriveOverallStatus = (tracks = {}) => {
  const food = TRACK_PROGRESS[normalizeTrackStatus(tracks.foodStatus)] ?? 0;
  const drink = TRACK_PROGRESS[normalizeTrackStatus(tracks.drinkStatus)] ?? 0;

  // Only the tracks that are actually required hold the order back.
  const required = [food, drink].filter((level) => level >= 0);
  const slowest = required.length > 0 ? Math.min(...required) : 0;

  return PROGRESS_TO_OVERALL[slowest] || 'Pending';
};

/**
 * May this role set the FINAL customer order status (currently just 'Completed')?
 *
 * This is the rule behind the chef's and the barista's 403 on
 * PATCH /orders/:id/status: completing an order means serving it, which belongs to
 * the floor. An oversight role keeps full access.
 *
 * @param {string} role stored staff role
 * @returns {boolean}
 */
const maySetFinalStatus = (role) => FINAL_STATUS_ROLES.includes(role);

/**
 * Is every required preparation track finished, i.e. may this order be completed?
 *
 * A track that is 'not_required' does not block anything, which is what lets a
 * food-only or a drink-only order reach the waiter without a phantom half.
 *
 * @param {{foodStatus?: string, drinkStatus?: string}} tracks
 * @returns {boolean}
 */
const isReadyForCompletion = (tracks = {}) =>
  TRACKS.every((track) => {
    const value = normalizeTrackStatus(tracks[trackStatusField(track)]);
    return value === 'not_required' || value === 'ready';
  });

/**
 * Can `role` move `track`?
 *
 * This is the authorization rule the API enforces, so a chef cannot set
 * drinkStatus and a barista cannot set foodStatus no matter what they send.
 *
 * @param {string} role stored staff role
 * @param {string} track 'food' | 'drink'
 * @returns {boolean}
 */
const mayUpdateTrack = (role, track) => {
  if (!TRACKS.includes(track)) return false;
  if (OVERSEER_ROLES.includes(role)) return true;
  return ROLE_TRACK[role] === track;
};

/**
 * Is `nextStatus` a legal move from `currentStatus` on a single track?
 *
 * @param {string} currentStatus current track status
 * @param {string} nextStatus    requested track status
 * @returns {boolean}
 */
const isValidTrackTransition = (currentStatus, nextStatus) =>
  Boolean(TRACK_TRANSITIONS[currentStatus]?.includes(nextStatus));

/**
 * Items on an order that belong to one preparation track.
 *
 * Used to build the chef's and the barista's view of a shared order. The document
 * on disk is never modified — this only narrows what a role is shown.
 *
 * @param {Array<{itemType?: string}>} items
 * @param {string} track 'food' | 'drink'
 * @returns {Array} the matching items
 */
const itemsForTrack = (items = [], track) =>
  items.filter((item) => (item.itemType || 'food') === track);

/**
 * The track status field name for a track, e.g. 'food' -> 'foodStatus'.
 *
 * @param {string} track
 * @returns {string}
 */
const trackStatusField = (track) => `${track}Status`;

/**
 * Split an order's items into the two preparation halves.
 *
 * The waiter needs to see both halves grouped and labelled — food above, drinks
 * below — rather than one undifferentiated list, which is what made a combined
 * order look half-finished at a glance.
 *
 * @param {Array<{itemType?: string}>} items
 * @returns {{foodItems: Array, drinkItems: Array}}
 */
const groupItemsByTrack = (items = []) => ({
  foodItems: itemsForTrack(items, 'food'),
  drinkItems: itemsForTrack(items, 'drink'),
});

/**
 * The complete status view of an order for any client.
 *
 * This is the fix for the waiter only receiving one status: the response always
 * carries BOTH preparation tracks plus the derived overall status, named
 * `overallStatus`, so no consumer has to guess or recompute it. `status` is kept
 * alongside it because the stored field is still called that (analytics and the
 * order filters read it), and a legacy `completed` track is normalised to `ready`
 * so an older order cannot present itself as a finished customer order.
 *
 * `canComplete` tells the client whether the final completion button should be
 * offered at all; the API re-checks it regardless, so this is presentation only.
 *
 * @param {object} order an order document or plain object
 * @returns {object}
 */
const toStatusPayload = (order = {}) => {
  const foodStatus = normalizeTrackStatus(order.foodStatus);
  const drinkStatus = normalizeTrackStatus(order.drinkStatus);

  return {
    foodStatus,
    drinkStatus,
    overallStatus: deriveOverallStatus({ foodStatus, drinkStatus }),
    foodRequired: foodStatus !== 'not_required',
    drinkRequired: drinkStatus !== 'not_required',
    canComplete: isReadyForCompletion({ foodStatus, drinkStatus }),
  };
};

/**
 * Advance BOTH required tracks so they agree with an overall status that was set
 * directly through the legacy PATCH /:id/status endpoint.
 *
 * That endpoint predates the split and is still what the admin and the waiter use
 * (a waiter closing a served order is a floor job, not a kitchen one). Without
 * this, an admin could close an order whose foodStatus was still 'pending' and the
 * two halves would then contradict each other.
 *
 * Tracks are only ever moved FORWARD, to the level the overall status implies, and
 * a 'not_required' track is left alone. Completed is terminal, so cancelling stays
 * the only way out of it.
 *
 * @param {{foodStatus?: string, drinkStatus?: string}} tracks current tracks
 * @param {string} overallStatus 'Pending' | 'Preparing' | 'Ready' | 'Completed'
 * @returns {{foodStatus: string, drinkStatus: string}}
 */
const syncTracksToOverall = (tracks = {}, overallStatus) => {
  const target = TRACK_PROGRESS[OVERALL_TO_TRACK[overallStatus]] ?? 0;

  const raise = (status) => {
    const current = TRACK_PROGRESS[normalizeTrackStatus(status)] ?? 0;
    // -1 means the order has none of these items, so there is nothing to move.
    if (current < 0) return status ?? 'not_required';
    if (current >= target) return status;
    return TRACK_STATUS_BY_PROGRESS[target];
  };

  return {
    foodStatus: raise(tracks.foodStatus),
    drinkStatus: raise(tracks.drinkStatus),
  };
};

module.exports = {
  TRACKS,
  TRACK_STATUSES,
  ACTIONABLE_TRACK_STATUSES,
  FINAL_STATUSES,
  ROLE_TRACK,
  OVERSEER_ROLES,
  FINAL_STATUS_ROLES,
  TRACK_TRANSITIONS,
  normalizeTrackStatus,
  initialTrackStatuses,
  deriveOverallStatus,
  maySetFinalStatus,
  isReadyForCompletion,
  syncTracksToOverall,
  mayUpdateTrack,
  isValidTrackTransition,
  itemsForTrack,
  trackStatusField,
  groupItemsByTrack,
  toStatusPayload,
};
