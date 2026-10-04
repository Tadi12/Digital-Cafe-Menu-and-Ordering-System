const mongoose = require('mongoose');

const orderItemSnapshotSchema = new mongoose.Schema({
  food: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food',
    required: true,
  },
  foodName: {
    en: { type: String, required: true },
    am: { type: String, required: true },
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  // Snapshot of the owning Category.type at the moment the order was placed.
  // Food and drinks share one `Food` collection, so this is what tells the chef
  // and the barista which half of the order they own. It is copied rather than
  // looked up through the category on every read, so retyping a category later
  // cannot silently re-route the history of an order that is already placed.
  itemType: {
    type: String,
    enum: ['food', 'drink'],
    default: 'food',
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    customerSessionId: {
      type: String,
      trim: true,
      default: '',
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: [true, 'Table reference is required'],
    },
    tableNumberSnapshot: {
      type: Number,
      required: true,
    },
    items: {
      type: [orderItemSnapshotSchema],
      validate: [
        (val) => val.length > 0,
        'Order must contain at least one item',
      ],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Telebirr', 'CBE', 'Dashen', 'Awash', 'BOA', 'Zemen'],
      default: 'Cash',
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Paid'],
      default: 'Unpaid',
    },
    // Overall customer-facing status. This is NOT an independent field that a
    // kitchen user edits: it is derived from foodStatus + drinkStatus by
    // utils/orderStatus.js every time either track moves, so the two preparation
    // tracks can never disagree with the single status the customer, the waiter,
    // the analytics and the revenue reports already read. Cancelled stays manual.
    status: {
      type: String,
      enum: ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    // Preparation track owned by the chef. 'not_required' when the order
    // contains no food, which is what keeps the overall status honest instead of
    // waiting forever on a half of the order that does not exist.
    foodStatus: {
      type: String,
      enum: ['not_required', 'pending', 'preparing', 'ready', 'completed'],
      default: 'not_required',
    },
    // Preparation track owned by the barista. See foodStatus.
    drinkStatus: {
      type: String,
      enum: ['not_required', 'pending', 'preparing', 'ready', 'completed'],
      default: 'not_required',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', orderSchema);
