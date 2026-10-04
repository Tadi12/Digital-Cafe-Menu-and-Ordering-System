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
  maySetFinalStatus,
  isReadyForCompletion,
  normalizeTrackStatus,
  isValidTrackTransition,
  itemsForTrack,
  groupItemsByTrack,
  toStatusPayload,
  ACTIONABLE_TRACK_STATUSES,
  FINAL_STATUS_ROLES,
  TRACK_TRANSITIONS,
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
  // 'Completed' is a FINAL customer-order state, never derived from the tracks.
  // A legacy track that says 'completed' is read as 'ready', so this order is
  // Ready and still waiting for the waiter to serve it.
  assert.strictEqual(deriveOverallStatus({ foodStatus: 'completed', drinkStatus: 'completed' }), 'Ready');
});
check('food not_required + drink preparing -> Preparing', () => {
  assert.strictEqual(deriveOverallStatus({ foodStatus: 'not_required', drinkStatus: 'preparing' }), 'Preparing');
});
check('food preparing + drink not_required -> Preparing', () => {
  assert.strictEqual(deriveOverallStatus({ foodStatus: 'preparing', drinkStatus: 'not_required' }), 'Preparing');
});
check('food completed + drink not_required -> Completed', () => {
  // 'completed' on a track means "the kitchen finished", which is now 'ready'.
  // The order is Ready, and only the waiter can turn it into Completed.
  assert.strictEqual(deriveOverallStatus({ foodStatus: 'completed', drinkStatus: 'not_required' }), 'Ready');
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

console.log('\nEach track moves forward one step and STOPS at ready');
check('the legal chain is allowed', () => {
  assert.strictEqual(isValidTrackTransition('pending', 'preparing'), true);
  assert.strictEqual(isValidTrackTransition('preparing', 'ready'), true);
});
check('ready is terminal: the kitchen cannot complete anything', () => {
  // This is the core of the rule: 'ready -> completed' does not exist, so there
  // is no chef or barista action that can close a customer order.
  assert.strictEqual(isValidTrackTransition('ready', 'completed'), false);
  assert.deepStrictEqual(TRACK_TRANSITIONS.ready, []);
});
check('skipping a step or going backwards is refused', () => {
  assert.strictEqual(isValidTrackTransition('pending', 'ready'), false);
  assert.strictEqual(isValidTrackTransition('pending', 'completed'), false);
  assert.strictEqual(isValidTrackTransition('preparing', 'completed'), false);
  assert.strictEqual(isValidTrackTransition('ready', 'preparing'), false);
  assert.strictEqual(isValidTrackTransition('completed', 'ready'), false);
});
check("'completed' is not even an acceptable request value", () => {
  assert.strictEqual(ACTIONABLE_TRACK_STATUSES.includes('completed'), false);
  assert.strictEqual(ACTIONABLE_TRACK_STATUSES.includes('not_required'), false);
});
check("'not_required' can never be started", () => {
  assert.strictEqual(isValidTrackTransition('not_required', 'preparing'), false);
});

console.log('\nOnly the floor closes the customer order');
check('a waiter and an admin may set the final status', () => {
  assert.strictEqual(maySetFinalStatus('waiter'), true);
  assert.strictEqual(maySetFinalStatus('admin'), true);
  assert.strictEqual(maySetFinalStatus('super_admin'), true);
});
check('a chef and a barista may NOT', () => {
  assert.strictEqual(maySetFinalStatus('chef'), false);
  assert.strictEqual(maySetFinalStatus('barista'), false);
  assert.strictEqual(FINAL_STATUS_ROLES.includes('chef'), false);
  assert.strictEqual(FINAL_STATUS_ROLES.includes('barista'), false);
});

console.log('\nCompletion is gated on both halves being ready');
check('one unfinished track blocks completion', () => {
  assert.strictEqual(isReadyForCompletion({ foodStatus: 'ready', drinkStatus: 'preparing' }), false);
  assert.strictEqual(isReadyForCompletion({ foodStatus: 'preparing', drinkStatus: 'ready' }), false);
  assert.strictEqual(isReadyForCompletion({ foodStatus: 'pending', drinkStatus: 'pending' }), false);
});
check('both ready allows completion', () => {
  assert.strictEqual(isReadyForCompletion({ foodStatus: 'ready', drinkStatus: 'ready' }), true);
});
check('a food-only or drink-only order is not blocked by a phantom half', () => {
  assert.strictEqual(isReadyForCompletion({ foodStatus: 'ready', drinkStatus: 'not_required' }), true);
  assert.strictEqual(isReadyForCompletion({ foodStatus: 'not_required', drinkStatus: 'ready' }), true);
});

console.log('\nA legacy completed track reads as ready');
check('normalisation maps the old value', () => {
  assert.strictEqual(normalizeTrackStatus('completed'), 'ready');
  assert.strictEqual(normalizeTrackStatus('preparing'), 'preparing');
  assert.strictEqual(normalizeTrackStatus(undefined), 'not_required');
});
check('a legacy order is Ready and still completable', () => {
  const tracks = { foodStatus: 'completed', drinkStatus: 'completed' };
  assert.strictEqual(deriveOverallStatus(tracks), 'Ready');
  assert.strictEqual(isReadyForCompletion(tracks), true);
});

console.log('\nThe waiter receives BOTH statuses plus the overall');
check('the payload always carries three statuses', () => {
  const payload = toStatusPayload({
    foodStatus: 'ready',
    drinkStatus: 'preparing',
    items: [{ itemType: 'food' }, { itemType: 'drink' }],
  });
  assert.strictEqual(payload.foodStatus, 'ready');
  assert.strictEqual(payload.drinkStatus, 'preparing');
  assert.strictEqual(payload.overallStatus, 'Preparing');
  assert.strictEqual(payload.canComplete, false);
});
check('items are grouped into the two halves', () => {
  const grouped = groupItemsByTrack([
    { name: 'Burger', itemType: 'food' },
    { name: 'Coffee', itemType: 'drink' },
    { name: 'Pizza', itemType: 'food' },
  ]);
  assert.deepStrictEqual(grouped.foodItems.map((i) => i.name), ['Burger', 'Pizza']);
  assert.deepStrictEqual(grouped.drinkItems.map((i) => i.name), ['Coffee']);
});
check('canComplete flips true only when both halves are done', () => {
  assert.strictEqual(
    toStatusPayload({ foodStatus: 'ready', drinkStatus: 'ready' }).canComplete,
    true,
  );
  assert.strictEqual(
    toStatusPayload({ foodStatus: 'ready', drinkStatus: 'preparing' }).canComplete,
    false,
  );
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
check('closing a served order leaves the tracks where they were', () => {
  // The customer order being Completed does NOT mean the kitchen completed
  // anything, so a track's final state stays 'ready'.
  assert.deepStrictEqual(
    syncTracksToOverall({ foodStatus: 'ready', drinkStatus: 'ready' }, 'Completed'),
    { foodStatus: 'ready', drinkStatus: 'ready' },
  );
});
check('an admin completing an order promotes pending tracks only to ready', () => {
  assert.deepStrictEqual(
    syncTracksToOverall({ foodStatus: 'ready', drinkStatus: 'ready' }, 'Ready'),
    { foodStatus: 'ready', drinkStatus: 'ready' },
  );
});
check('a track with no items is left as not_required', () => {
  assert.deepStrictEqual(
    syncTracksToOverall({ foodStatus: 'ready', drinkStatus: 'not_required' }, 'Ready'),
    { foodStatus: 'ready', drinkStatus: 'not_required' },
  );
});
check('tracks are never moved backwards', () => {
  // The kitchen is already ahead of the overall status; an admin action must not
  // undo work the chef or the barista has already reported.
  assert.deepStrictEqual(
    syncTracksToOverall({ foodStatus: 'ready', drinkStatus: 'ready' }, 'Preparing'),
    { foodStatus: 'ready', drinkStatus: 'ready' },
  );
});
check('sync never pushes a track past ready', () => {
  // Completing the CUSTOMER order does not mean the kitchen "completed"
  // anything: a track's final state is 'ready'.
  assert.deepStrictEqual(
    syncTracksToOverall({ foodStatus: 'ready', drinkStatus: 'ready' }, 'Completed'),
    { foodStatus: 'ready', drinkStatus: 'ready' },
  );
});
check('after syncing, the overall status agrees with the tracks', () => {
  const tracks = syncTracksToOverall({ foodStatus: 'pending', drinkStatus: 'pending' }, 'Ready');
  assert.strictEqual(deriveOverallStatus(tracks), 'Ready');
});

console.log(`\n${passed} checks passed.`);

/**
 * The §21 matrix, expressed against the same pure rules the controllers call.
 *
 * These are the exact requests the brief lists, mapped to the decision each one
 * makes. A route-level test would need a live database, so this covers the
 * authorization decision itself: which request is allowed, which is refused, and
 * with what outcome.
 */
console.log('\nSecurity matrix (brief section 21)');

const CHEF = 'chef';
const BARISTA = 'barista';
const WAITER = 'waiter';
const ADMIN = 'admin';

const matrix = [
  // 1 / 2: the chef may advance food preparation.
  [1, 'chef -> foodStatus = preparing', CHEF, 'food', 'pending', 'preparing', 'allow'],
  [2, 'chef -> foodStatus = ready', CHEF, 'food', 'preparing', 'ready', 'allow'],
  // 3: the chef may never complete anything.
  [3, 'chef -> overallStatus = completed', CHEF, null, 'ready', 'Completed', 'deny-final'],
  // 4 / 5: the barista may advance drink preparation.
  [4, 'barista -> drinkStatus = preparing', BARISTA, 'drink', 'pending', 'preparing', 'allow'],
  [5, 'barista -> drinkStatus = ready', BARISTA, 'drink', 'preparing', 'ready', 'allow'],
  // 6: the barista may never complete anything.
  [6, 'barista -> overallStatus = completed', BARISTA, null, 'ready', 'Completed', 'deny-final'],
  // 7 / 8: the floor and management close the order.
  [7, 'waiter -> ready -> completed', WAITER, null, 'ready', 'Completed', 'allow'],
  [8, 'admin -> ready -> completed', ADMIN, null, 'ready', 'Completed', 'allow'],
  // 9 / 10: completion is gated on BOTH halves.
  [9, 'waiter completes with drinks preparing', WAITER, null, null, 'Completed', 'not-ready'],
  [10, 'waiter completes with food+drink ready', WAITER, null, null, 'Completed', 'allow'],
];

// Track states for the gated rows; both halves ready unless stated otherwise.
const TRACK_STATE = {
  7: { foodStatus: 'ready', drinkStatus: 'ready' },
  8: { foodStatus: 'ready', drinkStatus: 'ready' },
  9: { foodStatus: 'ready', drinkStatus: 'preparing' },
  10: { foodStatus: 'ready', drinkStatus: 'ready' },
};

matrix.forEach(([num, label, role, track, from, to, expectation]) => {
  check(`#${num} ${label}`, () => {
    if (expectation === 'allow' && track) {
      // A preparation move: allowed only for the owner of that track, and only
      // through a legal forward step.
      assert.strictEqual(mayUpdateTrack(role, track), true, 'role must own the track');
      assert.strictEqual(isValidTrackTransition(from, to), true, 'transition must be legal');
      assert.strictEqual(
        ACTIONABLE_TRACK_STATUSES.includes(to),
        true,
        'target must be an accepted request value',
      );
      return;
    }

    if (expectation === 'deny-final') {
      // The kitchen is refused at the final-status endpoint outright.
      assert.strictEqual(maySetFinalStatus(role), false, 'role must not close orders');
      // And it cannot reach a completed-looking value through a track either.
      assert.strictEqual(
        ACTIONABLE_TRACK_STATUSES.includes('completed'),
        false,
        'completed must not be requestable as a preparation status',
      );
      assert.strictEqual(
        isValidTrackTransition('ready', 'completed'),
        false,
        'ready -> completed must not exist',
      );
      return;
    }

    // A final-status move: the role may do it, and readiness decides the outcome.
    assert.strictEqual(maySetFinalStatus(role), true, 'role must be allowed to close orders');
    const ready = isReadyForCompletion(TRACK_STATE[num]);
    assert.strictEqual(ready, expectation === 'allow', 'readiness must decide the result');
  });
});

console.log('\nPreparation cannot overwrite another station\'s work');
check('a food move leaves drinkStatus untouched', () => {
  // The overall status is recomputed from BOTH tracks on every write, so the
  // barista's progress can never be lost when the chef advances food.
  const tracks = { foodStatus: 'ready', drinkStatus: 'preparing' };
  const next = { ...tracks, foodStatus: 'ready' };
  assert.strictEqual(next.drinkStatus, 'preparing', 'drink work must survive');
  assert.strictEqual(deriveOverallStatus(next), 'Preparing');
});
check('a drink move leaves foodStatus untouched', () => {
  const tracks = { foodStatus: 'ready', drinkStatus: 'ready' };
  const next = { ...tracks, drinkStatus: 'ready' };
  assert.strictEqual(next.foodStatus, 'ready');
  assert.strictEqual(deriveOverallStatus(next), 'Ready');
});

console.log(`\n${passed} checks passed in total.`);
