/**
 * Reproduces the regression: a chef clicking their own preparation button got
 * INVALID_STATUS_TRANSITION ("That status change is not allowed for this order").
 *
 * Root cause: the socket emit carried `stationStatus` but the HTTP JSON response did
 * not. The client replaces its card with that response body, so the station's own
 * click stripped stationStatus off the card. With no current step, the next click
 * re-sent a transition the server had already applied -> refused.
 */

const assert = require('assert');
const mongoose = require('mongoose');

const { scopeForStation, toSocketPayload } = require('../sockets/socketHandler');
const { isValidTrackTransition } = require('./orderStatus');

const orderSchema = new mongoose.Schema({
  orderNumber: String,
  customerName: String,
  status: { type: String, default: 'Pending' },
  foodStatus: { type: String, default: 'pending' },
  drinkStatus: { type: String, default: 'not_required' },
  items: [{ foodName: { en: String }, price: Number, quantity: Number, itemType: String }],
});
const TestOrder = mongoose.model('TestOrderFix', orderSchema);

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

// The state right after the chef pressed "Start Preparing": the server wrote
// foodStatus = 'preparing' and derived the overall status to 'Preparing'.
const doc = new TestOrder({
  orderNumber: 'ORD-1001',
  customerName: 'Abebe',
  status: 'Preparing',
  foodStatus: 'preparing',
  drinkStatus: 'not_required',
  items: [
    { foodName: { en: 'Burger' }, price: 250, quantity: 1, itemType: 'food' },
    { foodName: { en: 'Coffee' }, price: 120, quantity: 1, itemType: 'drink' },
  ],
});

console.log('\nThe HTTP response now carries stationStatus (the actual bug)');
check('a station-scoped response includes stationStatus', () => {
  const scoped = scopeForStation(doc, 'food');
  assert.strictEqual(scoped.stationStatus, 'preparing');
  assert.strictEqual(scoped.station, 'food');
});
check('the response body keeps the derived overall status', () => {
  const body = toSocketPayload(scopeForStation(doc, 'food'));
  assert.strictEqual(body.overallStatus, 'Preparing');
  assert.strictEqual(body.status, 'Preparing');
});
check('the response narrows items to the caller station', () => {
  const body = toSocketPayload(scopeForStation(doc, 'food'));
  assert.strictEqual(body.items.length, 1);
  assert.strictEqual(body.items[0].foodName.en, 'Burger');
});
check('the barista branch of the same order gets its own half', () => {
  const body = toSocketPayload(scopeForStation(doc, 'drink'));
  assert.strictEqual(body.stationStatus, 'not_required');
  assert.strictEqual(body.items.length, 1);
  assert.strictEqual(body.items[0].foodName.en, 'Coffee');
});

console.log('\ntoSocketPayload accepts a document AND a plain object');
check('a Mongoose document still works', () => {
  const body = toSocketPayload(doc);
  assert.strictEqual(body.orderNumber, 'ORD-1001');
  assert.strictEqual(body.overallStatus, 'Preparing');
});
check('a plain object no longer throws on toObject()', () => {
  const plain = doc.toObject();
  assert.doesNotThrow(() => toSocketPayload(plain));
  assert.strictEqual(toSocketPayload(plain).orderNumber, 'ORD-1001');
});

console.log('\nThe chef\'s next legal action is the REAL one, not a repeat');
check('the response says preparing, so the button offers Mark Food Ready', () => {
  const body = toSocketPayload(scopeForStation(doc, 'food'));
  // PREPARATION_FLOW.preparing.next === 'ready'; the old broken payload had no
  // stationStatus, defaulted to 'pending', and offered 'preparing' again.
  assert.strictEqual(body.stationStatus, 'preparing');
  assert.strictEqual(isValidTrackTransition(body.stationStatus, 'preparing'), false);
  assert.strictEqual(isValidTrackTransition(body.stationStatus, 'ready'), true);
});

console.log('\nAn order the station has no work for still says so honestly');
check('a drink-only order tells the barista there is nothing to prepare', () => {
  const drinkOnly = new TestOrder({
    orderNumber: 'ORD-1002',
    status: 'Pending',
    foodStatus: 'not_required',
    drinkStatus: 'pending',
    items: [{ foodName: { en: 'Coffee' }, price: 120, quantity: 1, itemType: 'drink' }],
  });
  const body = toSocketPayload(scopeForStation(drinkOnly, 'food'));
  assert.strictEqual(body.items.length, 0);
  assert.strictEqual(body.stationStatus, 'not_required');
  // Nothing to press, so no illegal request can be built from it.
  assert.strictEqual(isValidTrackTransition('not_required', 'preparing'), false);
});

console.log(`\n${passed} checks passed.`);
mongoose.deleteModel(/^TestOrderFix/);