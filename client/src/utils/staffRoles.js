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

export { STAFF_ROLE_LABEL_KEYS };
export default staffRoleLabel;
