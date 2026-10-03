const CafeSettings = require('../models/CafeSettings');
const { clearGeofenceConfigCache } = require('../middleware/geofenceMiddleware');

const MAX_RADIUS_M = 10000;

const toFiniteNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const isValidLatitude = (value) => value !== null && value >= -90 && value <= 90;
const isValidLongitude = (value) => value !== null && value >= -180 && value <= 180;

const getSettings = async (req, res) => {
  let settings = await CafeSettings.findOne();
  if (!settings) settings = await CafeSettings.create({});
  // If not admin, don't return the PIN (wait, we actually DO need the PIN for validation, but we validate on the backend)
  // Actually, the customer POSTs the PIN to validate.
  res.json({ success: true, data: settings });
};

const updateSettings = async (req, res) => {
  const { accessPin, geofenceEnabled, geofenceLat, geofenceLon, geofenceRadiusM } = req.body;

  let settings = await CafeSettings.findOne();
  if (!settings) settings = await CafeSettings.create({});

  if (accessPin) settings.accessPin = accessPin;

  if (geofenceEnabled !== undefined) settings.geofenceEnabled = Boolean(geofenceEnabled);

  // The centre is stored as a pair. Validate both together so the fence is
  // never half-updated into a state the middleware cannot reason about.
  const isProvided = (value) => value !== undefined && value !== null && value !== '';

  if (isProvided(geofenceLat) || isProvided(geofenceLon)) {
    const lat = toFiniteNumber(geofenceLat);
    const lon = toFiniteNumber(geofenceLon);

    if (!isValidLatitude(lat) || !isValidLongitude(lon)) {
      return res.status(400).json({
        success: false,
        message: 'Latitude (-90 to 90) and longitude (-180 to 180) are both required.',
      });
    }

    settings.geofenceLat = lat;
    settings.geofenceLon = lon;
  }

  if (isProvided(geofenceRadiusM)) {
    const radius = toFiniteNumber(geofenceRadiusM);

    if (radius === null || radius <= 0 || radius > MAX_RADIUS_M) {
      return res.status(400).json({
        success: false,
        message: `Radius must be a number greater than 0 and at most ${MAX_RADIUS_M} meters.`,
      });
    }

    settings.geofenceRadiusM = radius;
  }

  await settings.save();

  // Apply the new fence immediately instead of waiting for the config cache.
  clearGeofenceConfigCache();

  res.json({ success: true, data: settings });
};

const validatePin = async (req, res) => {
  const { pin } = req.body;
  const settings = await CafeSettings.findOne();
  if (!settings || settings.accessPin !== pin) {
    return res.status(403).json({ success: false, message: 'Invalid PIN code.' });
  }
  res.json({ success: true, message: 'PIN Accepted' });
};

module.exports = { getSettings, updateSettings, validatePin };
