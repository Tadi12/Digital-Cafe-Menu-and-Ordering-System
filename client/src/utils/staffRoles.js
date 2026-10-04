/**
 * Single place that maps a stored staff role to its translated wording.
 *
 * The API stores roles as English enum strings ('super_admin', 'chef', ...).
 * They are identifiers, not copy, so they must never be rendered directly —
 * a chef opening /chef/profile would otherwise be greeted as "Admin Profile".
 * Mirrors the pattern used by utils/orderStatus.js for order statuses.
 */

/** Must stay in sync with the enum in server/models/Admin.js. */
const STAFF_ROLE_LABEL_KEYS = {
  super_admin: 'role_super_admin',
  admin: 'role_admin',
  chef: 'role_chef',
  waiter: 'role_waiter',
};

/** @returns the translation key for a role, or null when it is not recognised. */
export const staffRoleLabelKey = (role) => STAFF_ROLE_LABEL_KEYS[role] || null;

/**
 * @param {string}   role stored role value
 * @param {Function} t    i18next `t`
 * @returns {string} translated role name, falling back to the raw value
 */
export const staffRoleLabel = (role, t) => {
  const key = staffRoleLabelKey(role);
  return key ? t(key) : role || t('role');
};

/**
 * Page title for the profile screen, which the admin, chef and waiter routes all
 * share. Composed from the role name so each staff member sees their own title
 * ("Waiter Profile") rather than the generic "Admin Profile".
 *
 * @param {string}   role stored role value
 * @param {Function} t    i18next `t`
 * @returns {string} translated page title
 */
export const staffProfileTitle = (role, t) =>
  t('profile_title', { role: staffRoleLabel(role, t) });

/**
 * Route prefix for a role's staff area. Mirrors the route tree in
 * routes/AppRoutes.jsx so the navbar can send a notification click to the right
 * orders screen instead of always dropping a waiter at /admin/orders.
 *
 * @param {string} role stored role value
 * @returns {string} route prefix, defaulting to /admin
 */
const staffBasePath = (role) => {
  if (role === 'chef') return '/chef';
  if (role === 'waiter') return '/waiter';
  return '/admin';
};

/**
 * Roles that can carry out the waiter jobs in ORDER_STATUS_FLOW: taking a Ready
 * order to its table and answering a call_waiter. The kitchen deliberately does
 * not appear, so a chef tablet does not ring the floor call sound.
 *
 * @param {string} role stored role value
 * @returns {boolean}
 */
const isFloorStaffRole = (role) => role === 'waiter' || role === 'admin' || role === 'super_admin';

export { STAFF_ROLE_LABEL_KEYS, staffBasePath, isFloorStaffRole };
export default staffRoleLabel;
