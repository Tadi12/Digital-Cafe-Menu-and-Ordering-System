const mongoose = require('mongoose');
const { CATEGORY_TYPES } = require('../utils/categoryTypes');

const categorySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      // 'extras' is a third MENU grouping, not a third kitchen — it routes to the
      // chef like 'food' does. See utils/categoryTypes.js, which owns this list and
      // the type -> track mapping, so the enum and the routing can never disagree.
      enum: CATEGORY_TYPES,
      default: 'food',
      required: [true, 'Category type is required'],
    },
    name: {
      en: {
        type: String,
        required: [true, 'Category English name is required'],
        trim: true,
      },
      am: {
        type: String,
        required: [true, 'Category Amharic name is required'],
        trim: true,
      },
    },
    image: {
      url: {
        type: String,
        required: [true, 'Category image URL is required'],
      },
      publicId: {
        type: String,
        default: '',
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Category', categorySchema);
