const mongoose = require('mongoose');
const cafeSettingsSchema = new mongoose.Schema({
  accessPin: { type: String, default: '1234' }
});
module.exports = mongoose.model('CafeSettings', cafeSettingsSchema);
