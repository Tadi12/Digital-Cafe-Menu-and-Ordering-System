/**
 * Proves the two defects that made every staff order list come back empty, using
 * real Mongoose documents rather than mocks.
 *
 * 1. `{...order}` on a document does NOT copy the schema fields. It copies Mongoose
 *    internal bookkeeping, so the response had no orderNumber / items / total.
 * 2. The kitchen roles must not be filtered by table ownership, or `$in: []`
 *    matches nothing and the whole queue disappears.
 *
 * Run with: node utils/orderListBug.test.js  (needs Mongoose, not a database)
 */

const assert = require('assert');
const mongoose = require('mongoose');

const {
  isRestrictedByTableOwnership,
  tableOwnershipFilter,
  getAssignedTableIds,
} = require('./tableAssignment');
const { itemsForTrack, groupItemsByTrack } = require('./orderStatus');

// A minimal stand-in with the same shape as the Order model's item snapshot.
const orderSchema = new mongoose.Schema({
  orderNumber: String,
  customerName: String,
  totalAmount: Number,
  foodStatus: { type: String, default: 'pending' },
  drinkStatus: { type: String, default: 'not_required' },
  items: [
    {
      foodName: { en: String, am: String },
      price: Number,
      quantity: Number,
      itemType: { type: String, default: 'food' },
    },
  ],
});
const TestOrder = mongoose.model('TestOrder', orderSchema);

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

const CHEF = { _id: 'c1'.repeat(12), role: 'chef' };
const BARISTA = { _id: 'b1'.repeat(12), role: 'barista' };
const WAITER = { _id: 'w1'.repeat(12), role: 'waiter' };
const ADMIN = { _id: 'a1'.repeat(12), role: 'admin' };

console.log('\nSpreading a Mongoose document (the admin/waiter response bug)');

const doc = new TestOrder({
  orderNumber: 'ORD-1001',
  customerName: 'Abebe',
  totalAmount: 370,
  foodStatus: 'ready',
  drinkStatus: 'preparing',
  items: [
    { foodName: { en: 'Burger', am: 'በርገር' }, price: 250, quantity: 1, itemType: 'food' },
    { foodName: { en: 'Coffee', am: 'ቡና' }, price: 120, quantity: 1, itemType: 'drink' },
  ],
});

check('a naive {...order} spread LOSES the schema fields', () => {
  // This documents the bug rather than asserting good behaviour: if a future
  // refactor reintroduces the spread, this fails and points straight at it.
  const broken = { ...doc };
  assert.strictEqual(broken.orderNumber, undefined, 'orderNumber must not survive a raw spread');
  assert.strictEqual(broken.totalAmount, undefined);
  assert.strictEqual(broken._id, undefined);
});

check('toObject() first produces a complete, serialisable payload', () => {
  const plain = doc.toObject();
  const payload = {
    ...plain,
    ...groupItemsByTrack(plain.items || []),
  };
  assert.strictEqual(payload.orderNumber, 'ORD-1001');
  assert.strictEqual(payload.totalAmount, 370);
  assert.ok(payload._id, '_id must be present');
  assert.strictEqual(payload.items.length, 2);
  assert.strictEqual(payload.foodItems[0].foodName.en, 'Burger');
  assert.strictEqual(payload.drinkItems[0].foodName.en, 'Coffee');
  // And it must actually survive JSON, which is how it reaches the client.
  const overWire = JSON.parse(JSON.stringify(payload));
  assert.strictEqual(overWire.orderNumber, 'ORD-1001');
  assert.strictEqual(overWire.foodItems.length, 1);
});

check('station scoping works off the plain object', () => {
  const plain = doc.toObject();
  // Mirrors the controller's station branch, including how stationStatus is read.
  const foodOnly = {
    ...plain,
    items: itemsForTrack(plain.items, 'food'),
    station: 'food',
    stationStatus: plain.foodStatus,
  };
  assert.strictEqual(foodOnly.items.length, 1);
  assert.strictEqual(foodOnly.items[0].itemType, 'food');
  assert.strictEqual(foodOnly.stationStatus, 'ready');

  // The barista branch of the same order must see only the drink line.
  const drinkOnly = {
    ...plain,
    items: itemsForTrack(plain.items, 'drink'),
    station: 'drink',
    stationStatus: plain.drinkStatus,
  };
  assert.strictEqual(drinkOnly.items.length, 1);
  assert.strictEqual(drinkOnly.items[0].itemType, 'drink');
  assert.strictEqual(drinkOnly.stationStatus, 'preparing');
});

console.log('\nTable ownership must not narrow the kitchen (the chef/barista bug)');

check('only a waiter is restricted by table ownership', () => {
  assert.strictEqual(isRestrictedByTableOwnership(WAITER), true);
  assert.strictEqual(isRestrictedByTableOwnership(CHEF), false);
  assert.strictEqual(isRestrictedByTableOwnership(BARISTA), false);
  assert.strictEqual(isRestrictedByTableOwnership(ADMIN), false);
});

check('the kitchen resolves as unrestricted, not as an empty list', async () => {
  // getAssignedTableIds is async but returns without touching the database for
  // these roles, so this is safe to assert directly.
  const forChef = await getAssignedTableIds(CHEF);
  const forBarista = await getAssignedTableIds(BARISTA);
  const forAdmin = await getAssignedTableIds(ADMIN);
  assert.strictEqual(forChef, null, 'chef must be unrestricted');
  assert.strictEqual(forBarista, null, 'barista must be unrestricted');
  assert.strictEqual(forAdmin, null, 'admin must be unrestricted');
});

check('an unrestricted role gets NO table filter', () => {
  assert.deepStrictEqual(tableOwnershipFilter(ADMIN, null), {});
  // What the chef/barista branch now does: it never calls the filter at all, so
  // no `$in: []` can be built for them.
  assert.deepStrictEqual(
    isRestrictedByTableOwnership(CHEF) ? tableOwnershipFilter(CHEF, []) : {},
    {},
  );
});

check('a waiter with no tables still matches nothing (fails closed)', () => {
  assert.deepStrictEqual(tableOwnershipFilter(WAITER, []), { table: { $in: [] } });
  assert.deepStrictEqual(tableOwnershipFilter(WAITER, ['t1']), { table: { $in: ['t1'] } });
});

console.log(`\n${passed} checks passed.`);
mongoose.deleteModel(/^TestOrder/);
