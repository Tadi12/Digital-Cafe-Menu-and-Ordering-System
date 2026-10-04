/**
 * Single source of truth for the food / drink preparation split.
 *
 * A customer order stays ONE document. The chef and the barista work on two
 * independent tracks *inside* it (`foodStatus` / `drinkStatus`), and the overall
 * `status` the customer already sees is derived from those two. Every rule lives
 * here so the order controller, the socket layer and the migration script cannot
 * drift apart, and so no frontend component has to re-implement the maths.
 *
 * This affects preparation only. `totalAmount`, the payment fields and the order
 * number are untouched: splitting an order by kitchen never splits its money.
 */

/** The two preparation tracks. */
const TRACKS = ['food', 'drink'];

/** Values a track can hold. 'not_required' means the order has no such items. */
const TRACK_STATUSES = ['not_required', 'pending', 'preparing', 'ready', 'completed'];

/** Statuses a chef or barista is allowed to request. 'not_required' is not one. */
const ACTIONABLE_TRACK_STATUSES = ['pending', 'preparing', 'ready', 'completed'];

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
 * Forward-only transitions within a single track.
 *
 * 'not_required' is deliberately absent from every list: a track that was not
 * required when the order was placed can never be started later, and a track that
 * reached 'completed' is terminal.
 */
const TRACK_TRANSITIONS = {
  pending: ['preparing'],
  preparing: ['ready'],
  ready: ['completed'],
  completed: [],
};

/** Ordering used to fold two tracks into one overall status. */
const TRACK_PROGRESS = {
  not_required: -1,
  pending: 0,
  preparing: 1,
  ready: 2,
  completed: 3,
};

/** Overall status produced when the slowest required track has reached a level. */
const PROGRESS_TO_OVERALL = {
  0: 'Pending',
  1: 'Preparing',
  2: 'Ready',
  3: 'Completed',
};

/** Reverse lookups for syncTracksToOverall: the track level an overall status implies. */
const OVERALL_TO_TRACK = {
  Pending: 'pending',
  Preparing: 'preparing',
  Ready: 'ready',
  Completed: 'completed',
};

const TRACK_STATUS_BY_PROGRESS = {
  0: 'pending',
  1: 'preparing',
  2: 'ready',
  3: 'completed',
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
  const food = TRACK_PROGRESS[tracks.foodStatus ?? 'not_required'] ?? 0;
  const drink = TRACK_PROGRESS[tracks.drinkStatus ?? 'not_required'] ?? 0;

  // Only the tracks that are actually required hold the order back.
  const required = [food, drink].filter((level) => level >= 0);
  const slowest = required.length > 0 ? Math.min(...required) : 0;

  return PROGRESS_TO_OVERALL[slowest] || 'Pending';
};

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
    const current = TRACK_PROGRESS[status ?? 'not_required'] ?? 0;
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
  ROLE_TRACK,
  OVERSEER_ROLES,
  TRACK_TRANSITIONS,
  initialTrackStatuses,
  deriveOverallStatus,
  syncTracksToOverall,
  mayUpdateTrack,
  isValidTrackTransition,
  itemsForTrack,
  trackStatusField,
};
