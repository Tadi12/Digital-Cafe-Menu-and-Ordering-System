const mongoose = require('mongoose');
const cafeSettingsSchema = new mongoose.Schema({
  accessPin: { type: String, default: '1234' },
  // Geofence definition for customer menu access. latitude/longitude are the
  // cafe centre; radiusM is how far a customer may be from it and still reach
  // the menu. A null centre means the fence is unconfigured and the API fails
  // closed rather than publishing the menu.
  geofenceEnabled: { type: Boolean, default: true },
  geofenceLat: { type: Number, default: null },
  geofenceLon: { type: Number, default: null },
  geofenceRadiusM: { type: Number, default: 200 }
});
module.exports = mongoose.model('CafeSettings', cafeSettingsSchema);
