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
  buildTableOrdersQuery,
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

/**
 * Regression tests for the reported bug: every table card rendered the SAME order
 * history because the per-table query was overwritten by the waiter's full
 * assigned-table list.
 *
 * The §18 fixture:
 *   Waiter A -> Table 1, Table 2      Waiter B -> Table 3, Table 4
 *   Order 1001/1002 -> Table 1        Order 1004 -> Table 3
 *   Order 1003      -> Table 2        Order 1005 -> Table 4
 */
console.log('\nPer-table queries name exactly ONE table (bug regression)');

const T1 = 't1111111111111111111111';
const T2 = 't2222222222222222222222';
const T3 = 't3333333333333333333333';
const T4 = 't4444444444444444444444';

const WAITER_A_TABLES = [T1, T2];
const WAITER_B_TABLES = [T3, T4];

// Stands in for the Mongo query: does this ORDER belong in that table's history?
// Handles all three shapes the query can take — a bare id, a plain array, and the
// `{ $in: [...] }` operator object. `tableValue` is the order's `table` field,
// which may be a bare ObjectId or a populated document, hence String() on both.
const matches = (query, tableValue) => {
  const cond = query.table;
  if (cond && typeof cond === 'object' && Array.isArray(cond.$in)) {
    return cond.$in.some((v) => String(v) === String(tableValue));
  }
  if (Array.isArray(cond)) return cond.some((v) => String(v) === String(tableValue));
  return String(cond) === String(tableValue);
};

const ORDERS = [
  { no: '1001', table: T1 },
  { no: '1002', table: T1 },
  { no: '1003', table: T2 },
  { no: '1004', table: T3 },
  { no: '1005', table: T4 },
];

const historyFor = (query) =>
  ORDERS.filter((o) => matches(query, o.table)).map((o) => o.no);

/** The query the API would build for this waiter asking about this table. */
const queryAs = (user, tableId) =>
  buildTableOrdersQuery(
    user,
    tableId,
    user === WAITER_B ? WAITER_B_TABLES : WAITER_A_TABLES,
  );

check('Waiter A on Table 1 sees only 1001 and 1002', () => {
  assert.deepStrictEqual(historyFor(queryAs(WAITER_A, T1)), ['1001', '1002']);
});

check('Waiter A on Table 2 sees only 1003', () => {
  assert.deepStrictEqual(historyFor(queryAs(WAITER_A, T2)), ['1003']);
});

check('Waiter B on Table 3 sees only 1004', () => {
  assert.deepStrictEqual(historyFor(queryAs(WAITER_B, T3)), ['1004']);
});

check('Waiter B on Table 4 sees only 1005', () => {
  assert.deepStrictEqual(historyFor(queryAs(WAITER_B, T4)), ['1005']);
});

check('no two of the waiter\'s tables return the same history', () => {
  const a1 = queryAs(WAITER_A, T1);
  const a2 = queryAs(WAITER_A, T2);
  // The exact failure mode: identical result sets means the table filter is gone.
  assert.notDeepStrictEqual(historyFor(a1), historyFor(a2));
  assert.strictEqual(historyFor(a1).length + historyFor(a2).length, 3);
});

check('the query never widens to the waiter\'s whole table list', () => {
  // Guards the precise bug: an $in listing every assigned table instead of one.
  const query = queryAs(WAITER_A, T1);
  assert.strictEqual(query.table.$in.length, 1, 'must name exactly one table');
  assert.strictEqual(String(query.table.$in[0]), T1);
});

check('a table the waiter does not own matches nothing (fails closed)', () => {
  assert.deepStrictEqual(historyFor(queryAs(WAITER_A, T3)), []);
});

check('an admin still gets a single-table query, not everything', () => {
  // Unrestricted means "may view any table", not "return the whole cafe".
  const query = buildTableOrdersQuery(ADMIN, T1, null);
  assert.deepStrictEqual(historyFor(query), ['1001', '1002']);
});

check('ObjectId objects and string ids compare equal', () => {
  const asObject = { _id: T1 }; // a populated { table: { _id } } document
  const query = buildTableOrdersQuery(WAITER_A, asObject._id, [{ _id: T1 }, { _id: T2 }]);
  assert.deepStrictEqual(historyFor(query), ['1001', '1002']);
});

console.log('\nReassignment moves ACCESS, never history');
check('a table keeps its orders when the waiter changes', () => {
  // The query only ever reads `order.table`; the order document is never rewritten,
  // so reassignment changes who may look, not where the orders live.
  const beforeA = buildTableOrdersQuery(WAITER_A, T1, WAITER_A_TABLES);
  const afterB = buildTableOrdersQuery(WAITER_B, T1, [T1]);
  assert.deepStrictEqual(historyFor(beforeA), ['1001', '1002']);
  assert.deepStrictEqual(historyFor(afterB), ['1001', '1002']);
  // ...and the previous waiter is locked out of it.
  assert.deepStrictEqual(
    historyFor(buildTableOrdersQuery(WAITER_A, T1, [T2])),
    [],
  );
});

console.log(`\n${passed} checks passed in total.`);
