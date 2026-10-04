/**
 * Backfill the food / drink split onto orders created before the barista existed.
 *
 * Safe by construction:
 *   - read-only with respect to money: totalAmount, payment fields, order numbers
 *     and order count are never touched;
 *   - never deletes anything, and does not require the new schema fields to exist;
 *   - idempotent: re-running it changes nothing, because an order that already has
 *     both tracks set is skipped unless it is explicitly rewritten;
 *   - defaults first: the query matches orders missing either track, so even a
 *     partial earlier run converges.
 *
 * Run with:  npm run migrate:barista        (from the server folder)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Order = require('../models/Order');
const Food = require('../models/Food');
const { initialTrackStatuses, deriveOverallStatus } = require('./orderStatus');

const resolveItemTypes = async (orders) => {
  // One lookup for every distinct menu item in the batch rather than one per line.
  const itemIds = [...new Set(orders.flatMap((order) => order.items.map((item) => item.food?.toString())).filter(Boolean))];
  if (itemIds.length === 0) return new Map();

  const foods = await Food.find({ _id: { $in: itemIds } }).populate('category', 'type');
  return new Map(
    foods.map((food) => [
      food._id.toString(),
      // An item whose category was deleted, or a category with no type, is treated
      // as food: that is the schema default and matches how it behaved before.
      food.category?.type === 'drink' ? 'drink' : 'food',
    ]),
  );
};

const run = async () => {
  await connectDB();

  // Missing on either track: covers brand-new orders and half-migrated ones.
  const orders = await Order.find({
    $or: [{ foodStatus: { $exists: false } }, { drinkStatus: { $exists: false } }],
  });

  if (orders.length === 0) {
    console.log('[Migrate:Barista] No orders need migrating. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log(`[Migrate:Barista] Found ${orders.length} order(s) to backfill.`);
  const typeByFoodId = await resolveItemTypes(orders);

  let updated = 0;
  let keptItems = 0;

  for (const order of orders) {
    for (const item of order.items) {
      const resolved = typeByFoodId.get(item.food?.toString());
      // Never downgrade an item that already carries a snapshot.
      if (resolved && !item.itemType) {
        item.itemType = resolved;
        keptItems += 1;
      }
    }

    const tracks = initialTrackStatuses(order.items);
    const overall = deriveOverallStatus(tracks);

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          foodStatus: tracks.foodStatus,
          drinkStatus: tracks.drinkStatus,
          // An order that is already Cancelled must not be resurrected into
          // 'Pending' just because its tracks were just initialised.
          status: order.status === 'Cancelled' ? 'Cancelled' : overall,
        },
      },
    );
    updated += 1;
  }

  const summary = await Order.aggregate([
    { $group: { _id: '$foodStatus', count: { $sum: 1 } } },
  ]);
  const drinkSummary = await Order.aggregate([
    { $group: { _id: '$drinkStatus', count: { $sum: 1 } } },
  ]);

  console.log(`[Migrate:Barista] Updated ${updated} order(s); set itemType on ${keptItems} item line(s).`);
  console.log('[Migrate:Barista] foodStatus  ->', JSON.stringify(summary));
  console.log('[Migrate:Barista] drinkStatus ->', JSON.stringify(drinkSummary));

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('[Migrate:Barista] Failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
