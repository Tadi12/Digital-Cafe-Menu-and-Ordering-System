const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema(
  {
    name: {
      en: {
        type: String,
        required: [true, 'Food English name is required'],
        trim: true,
      },
      am: {
        type: String,
        required: [true, 'Food Amharic name is required'],
        trim: true,
      },
    },
    price: {
      type: Number,
      required: [true, 'Food price is required'],
      min: [0, 'Price must be a positive number'],
    },
    ingredients: {
      en: [{ type: String, trim: true }],
      am: [{ type: String, trim: true }],
    },
    image: {
      url: {
        type: String,
        required: [true, 'Food image URL is required'],
      },
      publicId: {
        type: String,
        default: '',
      },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Food category reference is required'],
    },
    available: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Food', foodSchema);
