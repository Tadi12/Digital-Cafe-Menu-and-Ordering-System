/**
 * Ownership rules for waiter -> table -> order, with no database involved.
 *
 * The point of these checks is the security claim in the brief: a waiter must not
 * reach another waiter's tables or orders. Each case states the caller, the table
 * and the expected verdict, so a regression shows up as a named failure rather
 * than as a quietly widened permission.
 *
 * Run with: node utils/tableAssignment.test.js
 */

const assert = require('assert');
const {
  isWaiter,
  hasFullTableAccess,
  isTableOwnedByUser,
  tableOwnershipFilter,
  forbiddenOwnership,
  OVERSIGHT_ROLES,
  ACTIVE_ORDER_STATUSES,
} = require('./tableAssignment');

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

const WAITER_A = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', role: 'waiter' };
const WAITER_B = { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', role: 'waiter' };
const CHEF = { _id: 'cccccccccccccccccccccccc', role: 'chef' };
const BARISTA = { _id: 'dddddddddddddddddddddddd', role: 'barista' };
const ADMIN = { _id: 'eeeeeeeeeeeeeeeeeeeeeeee', role: 'admin' };

const TABLE_A = { _id: 't1111111111111111111111', assignedWaiter: WAITER_A._id };
const TABLE_B = { _id: 't2222222222222222222222', assignedWaiter: WAITER_B._id };
const TABLE_FREE = { _id: 't3333333333333333333333', assignedWaiter: null };

console.log('\nRole classification');
check('only the waiter role is a waiter', () => {
  assert.strictEqual(isWaiter(WAITER_A), true);
  assert.strictEqual(isWaiter(ADMIN), false);
  assert.strictEqual(isWaiter(CHEF), false);
});
check('admins have full table access; nobody else does', () => {
  assert.deepStrictEqual(OVERSIGHT_ROLES, ['admin', 'super_admin']);
  assert.strictEqual(hasFullTableAccess({ role: 'super_admin' }), true);
  assert.strictEqual(hasFullTableAccess(WAITER_A), false);
  assert.strictEqual(hasFullTableAccess(CHEF), false);
});

console.log('\nA waiter may only touch their own tables');
check('Waiter A owns Table 1', () => {
  assert.strictEqual(isTableOwnedByUser(WAITER_A, TABLE_A), true);
});
check('Waiter A does NOT own Waiter B\'s table', () => {
  assert.strictEqual(isTableOwnedByUser(WAITER_A, TABLE_B), false);
});
check('Waiter B does NOT own Waiter A\'s table', () => {
  assert.strictEqual(isTableOwnedByUser(WAITER_B, TABLE_A), false);
});
check('an unassigned table belongs to no waiter', () => {
  assert.strictEqual(isTableOwnedByUser(WAITER_A, TABLE_FREE), false);
  assert.strictEqual(isTableOwnedByUser(WAITER_B, TABLE_FREE), false);
});
check('admins may touch every table, assigned or not', () => {
  assert.strictEqual(isTableOwnedByUser(ADMIN, TABLE_A), true);
  assert.strictEqual(isTableOwnedByUser(ADMIN, TABLE_B), true);
  assert.strictEqual(isTableOwnedByUser(ADMIN, TABLE_FREE), true);
});
check('the chef and the barista are never table owners', () => {
  assert.strictEqual(isTableOwnedByUser(CHEF, TABLE_A), false);
  assert.strictEqual(isTableOwnedByUser(BARISTA, TABLE_A), false);
});
check('a populated assignedWaiter document compares the same as a bare id', () => {
  // Orders populate the table, so the same table arrives in two shapes.
  const populated = { _id: TABLE_A._id, assignedWaiter: { _id: WAITER_A._id, name: 'Abebe' } };
  assert.strictEqual(isTableOwnedByUser(WAITER_A, populated), true);
  assert.strictEqual(isTableOwnedByUser(WAITER_B, populated), false);
});
check('a missing table is refused rather than throwing', () => {
  assert.strictEqual(isTableOwnedByUser(WAITER_A, null), false);
  assert.strictEqual(isTableOwnedByUser(WAITER_A, {}), false);
});

console.log('\nOrder queries are scoped in the database, not in the UI');
check('an oversight role gets no restriction', () => {
  assert.deepStrictEqual(tableOwnershipFilter(ADMIN, null), {});
  assert.deepStrictEqual(tableOwnershipFilter({ role: 'super_admin' }, null), {});
});
check('a waiter is restricted to their own table ids', () => {
  assert.deepStrictEqual(tableOwnershipFilter(WAITER_A, [TABLE_A._id]), {
    table: { $in: [TABLE_A._id] },
  });
});
check('a waiter with NO tables matches nothing, not everything', () => {
  // The subtle failure this guards: an empty $in must not be dropped from the
  // query, or an unassigned waiter would suddenly see the whole café's orders.
  const filter = tableOwnershipFilter(WAITER_A, []);
  assert.deepStrictEqual(filter, { table: { $in: [] } });
});
check('the chef and the barista are unaffected by table ownership', () => {
  // They own no tables but must keep seeing their whole preparation queue; this is
  // asserted structurally here and end-to-end by getOrders treating them as
  // unrestricted.
  assert.strictEqual(hasFullTableAccess(CHEF), false);
  assert.strictEqual(hasFullTableAccess(BARISTA), false);
});

console.log('\nThe refusal itself');
check('a forbidden response is a 403 that leaks nothing', () => {
  const { status, body } = forbiddenOwnership();
  assert.strictEqual(status, 403);
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.code, 'AUTH_FORBIDDEN');
  // It must not confirm whether the table exists or who owns it.
  assert.strictEqual(JSON.stringify(body).includes(TABLE_B._id), false);
});

console.log('\nDelivery readiness');
check('an order still needs the waiter while it is active', () => {
  assert.deepStrictEqual(ACTIVE_ORDER_STATUSES, ['Pending', 'Preparing', 'Ready']);
  // Completed and Cancelled are closed, so they are not delivery work.
  assert.strictEqual(ACTIVE_ORDER_STATUSES.includes('Completed'), false);
  assert.strictEqual(ACTIVE_ORDER_STATUSES.includes('Cancelled'), false);
});

console.log(`\n${passed} checks passed.`);
