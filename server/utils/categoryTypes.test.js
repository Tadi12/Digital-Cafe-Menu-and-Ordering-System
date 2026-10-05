/**
 * Self-contained checks for the catalogue's category-type vocabulary.
 *
 * Pure-function tests: no database and no running server, so they can be run any
 * time with `node utils/categoryTypes.test.js`.
 *
 * The behaviour worth protecting is that 'extras' is a MENU grouping that the
 * CHEF prepares. If either half of that slips — extras routed to the barista, or
 * extras categories dropped from the food section — the failure is quiet: the item
 * is orderable and simply appears on the wrong ticket, or vanishes from the screen
 * that manages it. Both are covered below.
 */

const assert = require('assert');
const {
  CATEGORY_TYPES,
  CATEGORY_SECTIONS,
  CATEGORY_TRACK,
  isCategoryType,
  typesInSection,
  isTypeInSection,
  typesForQuery,
  trackForCategoryType,
} = require('./categoryTypes');

const CHEF = 'food';
const BARISTA = 'drink';

let passed = 0;
const check = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    console.error(`  FAIL ${name}\n       ${error.message}`);
    process.exitCode = 1;
  }
};

console.log('\nExtras is a valid category type');

check("'extras' is a known type", () => {
  assert.strictEqual(isCategoryType('extras'), true);
});

check("'food' and 'drink' are still valid", () => {
  assert.strictEqual(isCategoryType('food'), true);
  assert.strictEqual(isCategoryType('drink'), true);
});

check('an unknown or empty type is rejected', () => {
  assert.strictEqual(isCategoryType(''), false);
  assert.strictEqual(isCategoryType('dessert'), false);
  assert.strictEqual(isCategoryType(undefined), false);
  assert.strictEqual(isCategoryType(null), false);
});

console.log('\nExtras is prepared by the CHEF');

check("an extras order line routes to the food track", () => {
  assert.strictEqual(trackForCategoryType('extras'), CHEF);
});

check('a food line still routes to the food track', () => {
  assert.strictEqual(trackForCategoryType('food'), CHEF);
});

check('a drink line still routes to the drink track', () => {
  assert.strictEqual(trackForCategoryType('drink'), BARISTA);
});

check('extras and food are indistinguishable to the kitchen', () => {
  // This is the whole feature: one less thing for the chef to triage, and the
  // order's foodStatus covers an extras line with no extra state anywhere.
  assert.strictEqual(trackForCategoryType('extras'), trackForCategoryType('food'));
});

check('there are still only two kitchens', () => {
  const tracks = new Set(CATEGORY_TYPES.map(trackForCategoryType));
  assert.deepStrictEqual([...tracks].sort(), ['drink', 'food']);
});

console.log('\nExtras is browsed under the food section');

check('the food section contains food AND extras', () => {
  assert.deepStrictEqual(typesInSection('food').sort(), ['extras', 'food']);
});

check('the drink section contains only drinks', () => {
  assert.deepStrictEqual(typesInSection('drink'), ['drink']);
});

check('an extras category is in the food section, not the drink one', () => {
  assert.strictEqual(isTypeInSection('extras', 'food'), true);
  assert.strictEqual(isTypeInSection('extras', 'drink'), false);
});

check('a category with no type is a food category', () => {
  // Categories predating the field. getCategories normalises them to 'food', so
  // they must belong to the food section or they'd disappear from the menu.
  assert.strictEqual(isTypeInSection(undefined, 'food'), true);
  assert.strictEqual(isTypeInSection(null, 'food'), true);
  assert.strictEqual(isTypeInSection(undefined, 'drink'), false);
});

check('an unknown section matches nothing rather than everything', () => {
  assert.deepStrictEqual(typesInSection('nonsense'), []);
  assert.strictEqual(isTypeInSection('food', 'nonsense'), false);
});

console.log('\nThe ?type= query takes a section OR an exact type');

check('a section expands to its member types', () => {
  assert.deepStrictEqual(typesForQuery('food').sort(), ['extras', 'food']);
  assert.deepStrictEqual(typesForQuery('drink'), ['drink']);
});

check("an exact type that is not a section matches only itself", () => {
  // The category manager filters by 'extras'. Reading that as a section would
  // expand to nothing, and the endpoint treats "matches nothing" as "no filter",
  // so the dropdown would silently return the whole catalogue.
  assert.deepStrictEqual(typesForQuery('extras'), ['extras']);
});

check('?type=food still includes extras', () => {
  // The regression this whole feature hangs on: the food manager asks for
  // `?type=food` and must receive the extras categories too.
  assert.ok(typesForQuery('food').includes('extras'));
});

check('an unknown value matches nothing, which means no filter', () => {
  assert.deepStrictEqual(typesForQuery('dessert'), []);
  assert.deepStrictEqual(typesForQuery(''), []);
  assert.deepStrictEqual(typesForQuery(undefined), []);
});

check('a query never matches a typeless legacy category outside the food section', () => {
  // Legacy categories are folded in only when 'food' is among the wanted types,
  // because getCategories normalises them to 'food'.
  assert.ok(typesForQuery('food').includes('food'));
  assert.ok(!typesForQuery('drink').includes('food'));
  assert.ok(!typesForQuery('extras').includes('food'));
});

console.log('\nThe vocabulary is internally consistent');

check('every type is routable', () => {
  for (const type of CATEGORY_TYPES) {
    assert.ok(trackForCategoryType(type), `${type} has no track`);
  }
});

check('every type appears in exactly one section', () => {
  const seen = new Map();
  for (const [section, types] of Object.entries(CATEGORY_SECTIONS)) {
    for (const type of types) {
      assert.ok(!seen.has(type), `${type} is in both "${seen.get(type)}" and "${section}"`);
      seen.set(type, section);
    }
  }
  for (const type of CATEGORY_TYPES) {
    assert.ok(seen.has(type), `${type} is not filed under any section`);
  }
});

check('every type named in a section is a real type', () => {
  for (const types of Object.values(CATEGORY_SECTIONS)) {
    for (const type of types) {
      assert.ok(isCategoryType(type), `${type} is not a declared category type`);
    }
  }
});

check('the track map covers exactly the declared types', () => {
  assert.deepStrictEqual(Object.keys(CATEGORY_TRACK).sort(), [...CATEGORY_TYPES].sort());
});

console.log(`\n${passed} checks passed.\n`);
