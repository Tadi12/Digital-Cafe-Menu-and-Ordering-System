/**
 * The catalogue's vocabulary, client side.
 *
 * Mirrors server/utils/categoryTypes.js — the API is the authority for both the
 * valid types and the section a type is browsed under, and this copy exists so a
 * screen can group and label categories without a round trip per decision. Keep
 * the two in step when a type is added.
 *
 * The important distinction, restated because it is easy to get wrong here:
 *
 *   category.type  'food' | 'drink' | 'extras'
 *                 How the MENU is grouped.
 *
 *   itemType       'food' | 'drink'
 *                 Which KITCHEN prepares it. The order stores this, and it is what
 *                 the chef/barista split and the two preparation tracks are built
 *                 on.
 *
 * 'extras' is a third menu grouping that the CHEF prepares, so the client groups it
 * with food everywhere it groups by menu, and never with drinks. Nothing on the
 * client derives a track from a category type — the API sends the track on each
 * order line.
 */

/** Every valid category type, for rendering type pickers. */
export const CATEGORY_TYPES = ['food', 'drink', 'extras'];

/**
 * Menu sections and the types shown under each.
 *
 * `extras` lives under `food` because the chef prepares it: a customer browsing
 * food should see everything the kitchen makes, and an admin filtering the food
 * manager expects to manage every item the chef can be handed.
 */
export const CATEGORY_SECTIONS = {
  food: ['food', 'extras'],
  drink: ['drink'],
};

/** The types browsed under a menu section. Unknown sections match nothing. */
export const typesInSection = (section) => CATEGORY_SECTIONS[section] || [];

/**
 * Does a category belong in this menu section?
 *
 * A category with no `type` predates the field; the API normalises those to 'food',
 * so they belong to the food section.
 *
 * @param {string} type    the category's type, possibly undefined
 * @param {string} section 'food' | 'drink'
 * @returns {boolean}
 */
export const isTypeInSection = (type, section) =>
  typesInSection(section).includes(type || 'food');

/**
 * Is this category a drink category?
 *
 * The only question the customer menu really asks, because it decides whether a
 * tap opens the food detail sheet or the drink one, and which section a category
 * is listed under. Extras answers false — it is handled exactly like food.
 *
 * @param {object|string} category a category object, or a type string
 * @returns {boolean}
 */
export const isDrinkCategory = (category) => {
  const type = typeof category === 'string' ? category : category?.type;
  return type === 'drink';
};

/** Translation key for a category type's label. */
export const categoryTypeLabelKey = (type) => `category_type_${type || 'food'}`;

export default CATEGORY_TYPES;
