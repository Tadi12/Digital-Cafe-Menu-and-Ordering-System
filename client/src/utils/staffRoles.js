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
  barista: 'role_barista',
};

/**
 * Which half of a shared order each preparation role works on.
 *
 * Mirrors ROLE_TRACK in server/utils/orderStatus.js, which is what actually
 * enforces the rule on the API. The client copy exists only so the UI can decide
 * what to render — never to decide what is permitted.
 */
const ROLE_TRACK = {
  chef: 'food',
  barista: 'drink',
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
 * The ONE sign-in route, shared by every staff role.
 *
 * Authentication used to live at /admin/login, which made the login page look like
 * it belonged to the admin area and invited a second, role-specific login for each
 * station. There is a single account store and a single session, so there is one
 * page: it takes an email and a password and nothing else, and the role comes back
 * from the server. Named here so the login route, the guard that bounces anonymous
 * visitors, and every link to it cannot drift apart.
 *
 * NOT prefixed by a role, and deliberately not nested under /admin — /admin is a
 * protected application area, so an auth route underneath it is both a naming lie
 * and a trap for the route guards.
 */
const staffLoginPath = '/login';

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
  if (role === 'barista') return '/barista';
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

/**
 * The preparation track a role owns ('food' / 'drink'), or null for roles that
 * see the whole order. A chef or barista only ever sees their own half; an admin,
 * a waiter or a customer sees everything.
 *
 * @param {string} role stored role value
 * @returns {'food'|'drink'|null}
 */
const roleTrack = (role) => ROLE_TRACK[role] || null;

/**
 * Where a role lands straight after logging in.
 *
 * The kitchen roles (chef, barista) work a ticket queue and have no dashboard, so
 * they go straight to their orders screen; the floor and management roles keep the
 * dashboard they have always opened on.
 *
 * This is the ONLY place that maps a role to a landing page, and it is what makes
 * "one login page, many destinations" work: the shared /login form reads the role
 * off the authenticated account and calls this, so nobody picks their own
 * destination and no component grows a parallel role switch.
 *
 * @param {string} role stored role value
 * @returns {string} an absolute route
 */
const staffHomePath = (role) => {
  if (role === 'chef') return '/chef/dashboard';
  if (role === 'barista') return '/barista/dashboard';
  if (role === 'waiter') return '/waiter/dashboard';
  return '/admin/dashboard';
};

/** @returns {boolean} true when the role prepares one half of a shared order. */
const isStationRole = (role) => Boolean(ROLE_TRACK[role]);

/**
 * The two branding lines a role's chrome shows: the product name and the portal it
 * belongs to.
 *
 * This is the single source for the sidebar brand AND the navbar's role badge, so
 * the two cannot disagree about what to call somebody. Before this, the sidebar
 * answered it with two chains of ternaries; adding a fourth kitchen role meant
 * editing both, and forgetting one produced a chef greeted as "Hable Cafe Admin".
 */
const STAFF_BRAND_KEYS = {
  super_admin: { brand: 'admin_sidebar_title', portal: 'management_portal' },
  admin: { brand: 'admin_sidebar_title', portal: 'management_portal' },
  waiter: { brand: 'admin_sidebar_title_waiter', portal: 'service_portal' },
  chef: { brand: 'admin_sidebar_title_chef', portal: 'kitchen_portal' },
  barista: { brand: 'admin_sidebar_title_barista', portal: 'barista_portal' },
};

/**
 * The areas of the staff app a page can be. Matches the paths in
 * routes/AppRoutes.jsx and the sections in AdminSidebar.jsx.
 */
const STAFF_AREAS = [
  'dashboard',
  'orders',
  'foods',
  'drinks',
  'categories',
  'tables',
  'analytics',
  'staff',
  'settings',
  'devices',
  'profile',
];

/**
 * Default title per area — what management sees, and the fallback for any area a
 * role has no specific wording for.
 *
 * Areas only management can reach (foods, analytics, settings, ...) deliberately
 * have no per-role entry: a chef can never navigate to them, so a "Kitchen Food
 * Menu Management" heading would be a title for a screen that does not exist.
 */
const AREA_TITLE_KEYS = {
  dashboard: 'admin_page_dashboard',
  orders: 'admin_page_orders',
  foods: 'admin_page_foods',
  drinks: 'admin_page_drinks',
  categories: 'admin_page_categories',
  tables: 'admin_page_tables',
  analytics: 'admin_page_analytics',
  staff: 'staff_management',
  settings: 'settings_title',
  devices: 'admin_page_devices',
  profile: 'profile',
};

/**
 * Per-role overrides for the areas more than one role can actually open.
 *
 * A chef and a barista both work an order queue, but they are not looking at the
 * same queue: the chef sees food tickets, the barista sees drink tickets. Calling
 * both screens "Live Orders Queue" makes each of them doubt they are on the right
 * one, so the area is named for the station instead.
 */
const ROLE_AREA_TITLE_KEYS = {
  chef: { dashboard: 'chef_page_dashboard', orders: 'chef_page_orders' },
  barista: { dashboard: 'barista_page_dashboard', orders: 'barista_page_orders' },
  waiter: { dashboard: 'waiter_page_dashboard', orders: 'waiter_page_orders' },
};

/** @returns {{brand: string, portal: string}} translation keys for a role's branding. */
const staffBrandKeys = (role) => STAFF_BRAND_KEYS[role] || STAFF_BRAND_KEYS.super_admin;

/** @returns {string} translated product name for a role ("Hable Cafe Chef"). */
const staffBrandLabel = (role, t) => t(staffBrandKeys(role).brand);

/** @returns {string} translated portal name for a role ("Kitchen Portal"). */
const staffPortalLabel = (role, t) => t(staffBrandKeys(role).portal);

/** @returns {string} the translation key naming `area` for `role`. */
const staffAreaTitleKey = (role, area) =>
  ROLE_AREA_TITLE_KEYS[role]?.[area] || AREA_TITLE_KEYS[area] || 'admin_portal';

/**
 * The heading for an area, worded for the signed-in role.
 *
 * Management keeps the plain `admin_page_*` wording it has always had. A chef,
 * barista or waiter gets the station-specific name where one exists and the
 * default otherwise — which is why the waiter's table screen is still just
 * "My Tables" and the profile screen is composed from the role name rather than
 * needing a key per role.
 *
 * @param {string}   role stored role value
 * @param {string}   area one of STAFF_AREAS, or null for an unmatched path
 * @param {Function} t    i18next `t`
 * @returns {string} translated heading
 */
const staffAreaTitle = (role, area, t) => {
  if (area === 'profile') return staffProfileTitle(role, t);
  return t(staffAreaTitleKey(role, area));
};

export {
  STAFF_ROLE_LABEL_KEYS,
  STAFF_BRAND_KEYS,
  STAFF_AREAS,
  AREA_TITLE_KEYS,
  ROLE_AREA_TITLE_KEYS,
  ROLE_TRACK,
  staffLoginPath,
  staffBasePath,
  staffHomePath,
  staffBrandKeys,
  staffBrandLabel,
  staffPortalLabel,
  staffAreaTitleKey,
  staffAreaTitle,
  isFloorStaffRole,
  roleTrack,
  isStationRole,
};
export default staffRoleLabel;
