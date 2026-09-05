const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
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
