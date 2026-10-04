/**
 * Self-contained checks for the food / drink split rules.
 *
 * These are pure-function tests: no database and no running server, so they can
 * be run any time with `node utils/orderStatus.test.js`. They cover the rules the
 * kitchen workflow depends on — the overall-status maths, the role/track
 * permissions, and the guarantee that splitting never touches the money.
 */

const assert = require('assert');
const {
  initialTrackStatuses,
  deriveOverallStatus,
  syncTracksToOverall,
  mayUpdateTrack,
  isValidTrackTransition,
  itemsForTrack,
} = require('./orderStatus');

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

console.log('\nOverall status is derived from both tracks');
check('food preparing + drink ready -> Preparing', () => {
  assert.strictEqual(deriveOverallStatus({ foodStatus: 'preparing', drinkStatus: 'ready' }), 'Preparing');
});
check('food ready + drink ready -> Ready', () => {
  assert.strictEqual(deriveOverallStatus({ foodStatus: 'ready', drinkStatus: 'ready' }), 'Ready');
});
check('both completed -> Completed', () => {
  assert.strictEqual(deriveOverallStatus({ foodStatus: 'completed', drinkStatus: 'completed' }), 'Completed');
});
check('food not_required + drink preparing -> Preparing', () => {
  assert.strictEqual(deriveOverallStatus({ foodStatus: 'not_required', drinkStatus: 'preparing' }), 'Preparing');
});
check('food preparing + drink not_required -> Preparing', () => {
  assert.strictEqual(deriveOverallStatus({ foodStatus: 'preparing', drinkStatus: 'not_required' }), 'Preparing');
});
check('food completed + drink not_required -> Completed', () => {
  assert.strictEqual(deriveOverallStatus({ foodStatus: 'completed', drinkStatus: 'not_required' }), 'Completed');
});
check('the slowest REQUIRED track wins', () => {
  // The whole point: a finished kitchen must not report the order ready while the
  // barista's drinks are still being made.
  assert.strictEqual(deriveOverallStatus({ foodStatus: 'completed', drinkStatus: 'pending' }), 'Pending');
  assert.strictEqual(deriveOverallStatus({ foodStatus: 'completed', drinkStatus: 'ready' }), 'Ready');
});

console.log('\nNew orders seed both tracks correctly');
check('food only -> drinkStatus not_required', () => {
  assert.deepStrictEqual(initialTrackStatuses([{ itemType: 'food' }]), {
    foodStatus: 'pending',
    drinkStatus: 'not_required',
  });
});
check('drink only -> foodStatus not_required', () => {
  assert.deepStrictEqual(initialTrackStatuses([{ itemType: 'drink' }]), {
    foodStatus: 'not_required',
    drinkStatus: 'pending',
  });
});
check('mixed -> both pending', () => {
  assert.deepStrictEqual(
    initialTrackStatuses([{ itemType: 'food' }, { itemType: 'drink' }]),
    { foodStatus: 'pending', drinkStatus: 'pending' },
  );
});
check('an item with no itemType counts as food (schema default)', () => {
  assert.deepStrictEqual(initialTrackStatuses([{}]), {
    foodStatus: 'pending',
    drinkStatus: 'not_required',
  });
});

console.log('\nRoles can only touch their own track');
check('chef owns food only', () => {
  assert.strictEqual(mayUpdateTrack('chef', 'food'), true);
  assert.strictEqual(mayUpdateTrack('chef', 'drink'), false);
});
check('barista owns drink only', () => {
  assert.strictEqual(mayUpdateTrack('barista', 'drink'), true);
  assert.strictEqual(mayUpdateTrack('barista', 'food'), false);
});
check('admin and super_admin own both', () => {
  assert.strictEqual(mayUpdateTrack('admin', 'food'), true);
  assert.strictEqual(mayUpdateTrack('admin', 'drink'), true);
  assert.strictEqual(mayUpdateTrack('super_admin', 'food'), true);
  assert.strictEqual(mayUpdateTrack('super_admin', 'drink'), true);
});
check('waiter and unknown roles own neither track', () => {
  assert.strictEqual(mayUpdateTrack('waiter', 'food'), false);
  assert.strictEqual(mayUpdateTrack('waiter', 'drink'), false);
  assert.strictEqual(mayUpdateTrack('customer', 'food'), false);
});

console.log('\nEach track moves forward one step at a time');
check('the legal chain is allowed', () => {
  assert.strictEqual(isValidTrackTransition('pending', 'preparing'), true);
  assert.strictEqual(isValidTrackTransition('preparing', 'ready'), true);
  assert.strictEqual(isValidTrackTransition('ready', 'completed'), true);
});
check('skipping a step, going backwards and re-opening are refused', () => {
  assert.strictEqual(isValidTrackTransition('pending', 'ready'), false);
  assert.strictEqual(isValidTrackTransition('preparing', 'completed'), false);
  assert.strictEqual(isValidTrackTransition('ready', 'preparing'), false);
  assert.strictEqual(isValidTrackTransition('completed', 'ready'), false);
});
check("'not_required' can never be started", () => {
  assert.strictEqual(isValidTrackTransition('not_required', 'preparing'), false);
});

console.log('\nOne order, split only for display');
const sharedOrder = {
  _id: 'ORDER-1001',
  orderNumber: 'ORD-1001',
  // Burger 250x2 = 500 and Pizza 120x1 = 120  -> food half 620
  // Coffee 120x2 = 240 and Juice 100x1 = 100 -> drink half 340
  // The ONE customer order total is 960, counted exactly once.
  totalAmount: 960,
  items: [
    { name: 'Burger', quantity: 2, price: 250, itemType: 'food' },
    { name: 'Pizza', quantity: 1, price: 120, itemType: 'food' },
    { name: 'Coffee', quantity: 2, price: 120, itemType: 'drink' },
    { name: 'Juice', quantity: 1, price: 100, itemType: 'drink' },
  ],
};
check('the chef receives only the food lines', () => {
  assert.deepStrictEqual(
    itemsForTrack(sharedOrder.items, 'food').map((i) => i.name),
    ['Burger', 'Pizza'],
  );
});
check('the barista receives only the drink lines', () => {
  assert.deepStrictEqual(
    itemsForTrack(sharedOrder.items, 'drink').map((i) => i.name),
    ['Coffee', 'Juice'],
  );
});
check('the two halves together are exactly the original items', () => {
  const combined = [
    ...itemsForTrack(sharedOrder.items, 'food'),
    ...itemsForTrack(sharedOrder.items, 'drink'),
  ];
  assert.strictEqual(combined.length, sharedOrder.items.length);
});
check('the split does not touch the money', () => {
  const foodValue = itemsForTrack(sharedOrder.items, 'food')
    .reduce((sum, i) => sum + i.price * i.quantity, 0);
  const drinkValue = itemsForTrack(sharedOrder.items, 'drink')
    .reduce((sum, i) => sum + i.price * i.quantity, 0);
  // Revenue is computed per ORDER, never by summing the stations together twice.
  assert.strictEqual(sharedOrder.totalAmount, foodValue + drinkValue);
  assert.strictEqual(sharedOrder.totalAmount, 960);
  assert.strictEqual(foodValue, 620);
  assert.strictEqual(drinkValue, 340);
  // The doubling trap: adding the two stations' subtotals ON TOP of the order
  // total is exactly how revenue would silently double. It must not happen.
  assert.notStrictEqual(foodValue + drinkValue, sharedOrder.totalAmount * 2);
});

console.log('\nAdmin / waiter close the order through the legacy overall-status route');
check('closing a served order completes both tracks', () => {
  assert.deepStrictEqual(
    syncTracksToOverall({ foodStatus: 'ready', drinkStatus: 'ready' }, 'Completed'),
    { foodStatus: 'completed', drinkStatus: 'completed' },
  );
});
check('a track with no items is left as not_required', () => {
  assert.deepStrictEqual(
    syncTracksToOverall({ foodStatus: 'pending', drinkStatus: 'not_required' }, 'Completed'),
    { foodStatus: 'completed', drinkStatus: 'not_required' },
  );
});
check('tracks are never moved backwards', () => {
  // The kitchen is already ahead of the overall status; an admin action must not
  // undo work the chef or the barista has already reported.
  assert.deepStrictEqual(
    syncTracksToOverall({ foodStatus: 'completed', drinkStatus: 'completed' }, 'Preparing'),
    { foodStatus: 'completed', drinkStatus: 'completed' },
  );
});
check('after syncing, the overall status agrees with the tracks', () => {
  const tracks = syncTracksToOverall({ foodStatus: 'pending', drinkStatus: 'pending' }, 'Ready');
  assert.strictEqual(deriveOverallStatus(tracks), 'Ready');
});

console.log(`\n${passed} checks passed.`);
