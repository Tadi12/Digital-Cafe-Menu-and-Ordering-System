/**
 * The catalogue's vocabulary: which category types exist, which menu section each
 * one is browsed under, and which kitchen prepares it.
 *
 * Like utils/staffAccess.js and utils/orderStatus.js, this is a pure module with no
 * Mongoose, Express or socket dependency, so every layer can import it and it can
 * be tested without a database.
 *
 * ------------------------------------------------------------------
 * Category type is NOT a preparation track
 * ------------------------------------------------------------------
 * These are two different things and conflating them is what makes this fiddly:
 *
 *   category.type  ('food' | 'drink' | 'extras')
 *                  How the MENU is organised. Purely a catalogue label.
 *
 *   itemType       ('food' | 'drink')
 *                  Which KITCHEN prepares the line. An Order stores this, and it is
 *                  the only thing the chef/barista split and the whole
 *                  foodStatus/drinkStatus flow are built on.
 *
 * So `extras` is a third menu type that routes to the CHEF, and an extras order
 * line is stored with `itemType: 'food'`. That is the entire feature: a new way to
 * group food on the menu, with no third kitchen and no change to the order model,
 * the station permissions, or the two-track status flow.
 *
 * The mapping is written out in CATEGORY_TRACK rather than left to a
 * `type === 'drink' ? 'drink' : 'food'` fallback at each call site. That fallback
 * happens to be right today, but it silently routes any future type to the chef
 * without anybody deciding that, which is precisely the mistake worth designing
 * out. A new type now has to be added here to be routable at all.
 */

/** Every valid category type. The model's enum and the zod schemas mirror this. */
const CATEGORY_TYPES = ['food', 'drink', 'extras'];

/**
 * Menu sections, and the types browsed under each.
 *
 * A "section" is what the customer-facing menu and the admin category filter call
 * a tab or a dropdown entry. `extras` sits under `food` because the chef prepares
 * it — a customer looking for the kitchen's food should not have to know that
 * "extras" is a separate tab, and an admin filtering by "Food" expects to see
 * everything the chef makes.
 *
 * Every type must appear in exactly one section. `tests` in categoryTypes.test.js
 * assert that, so adding a type without filing it under a section fails the suite
 * rather than quietly vanishing from the menu.
 */
const CATEGORY_SECTIONS = {
  food: ['food', 'extras'],
  drink: ['drink'],
};

/**
 * Which preparation track each category type routes to.
 *
 * `extras -> food` is the whole point of the feature: the chef owns the food
 * track, so an extras line is prepared by the chef and shows up under the chef's
 * food tickets and the order's foodStatus.
 */
const CATEGORY_TRACK = {
  food: 'food',
  extras: 'food',
  drink: 'drink',
};

/** @returns {boolean} true when `value` is a known category type. */
const isCategoryType = (value) => CATEGORY_TYPES.includes(value);

/**
 * The category types browsed under a menu section.
 *
 * @param {string} section 'food' | 'drink'
 * @returns {string[]} member types; empty for an unknown section
 */
const typesInSection = (section) => CATEGORY_SECTIONS[section] || [];

/**
 * Does a category of this type belong in this menu section?
 *
 * A category with no type predates the field and is a food category — getCategories
 * normalises those to 'food' on the way out — so it belongs to the food section.
 *
 * @param {string} type    the category's type, possibly undefined
 * @param {string} section 'food' | 'drink'
 * @returns {boolean}
 */
const isTypeInSection = (type, section) =>
  typesInSection(section).includes(type || 'food');

/**
 * The category types a `?type=` query should match.
 *
 * Accepts either a menu SECTION, which expands to the types filed under it, or an
 * exact type. The category manager's dropdown filters by one specific type —
 * including 'extras', which is a type but not a section — so a section-only
 * interpretation would make `?type=extras` match nothing and return the entire
 * catalogue, which reads as "the filter does nothing".
 *
 * @param {string} value a section name or a category type
 * @returns {string[]} the types to match; empty when the value is neither
 */
const typesForQuery = (value) => {
  if (!value) return [];
  const section = typesInSection(value);
  if (section.length) return section;
  return isCategoryType(value) ? [value] : [];
};

/**
 * Which kitchen prepares a category of this type?
 *
 * Falls back to the food track for an unknown or missing type, matching how
 * getCategories treats a typeless legacy category as food. A category that cannot
 * be identified goes to the chef rather than silently disappearing from both
 * kitchens, which is the failure mode that loses a customer order.
 *
 * @param {string} type the category's type, possibly undefined
 * @returns {'food'|'drink'}
 */
const trackForCategoryType = (type) => CATEGORY_TRACK[type] || 'food';

module.exports = {
  CATEGORY_TYPES,
  CATEGORY_SECTIONS,
  CATEGORY_TRACK,
  isCategoryType,
  typesInSection,
  isTypeInSection,
  typesForQuery,
  trackForCategoryType,
};
