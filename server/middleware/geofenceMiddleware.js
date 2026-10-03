const CafeSettings = require('../models/CafeSettings');
const { normalizeIp, isLocalhost, isLocalhostBypassEnabled } = require('../utils/ipUtils');

// Mean Earth radius (IUGG). Good enough for a cafe-sized fence and avoids
// pulling in a mapping dependency.
const EARTH_RADIUS_M = 6371008.8;

const DEFAULT_RADIUS_M = 200;
const DEFAULT_MAX_ACCURACY_M = 150;

// A captured position is only trusted for a short window so a customer who was
// inside, left, and kept the tab open cannot keep replaying their old fix.
const MAX_POSITION_AGE_MS = 2 * 60 * 1000;

// Reading the settings document on every menu request would add a database
// round-trip to the hottest endpoint. Cache briefly; the admin settings update
// clears the cache so a radius change applies immediately.
const CONFIG_CACHE_TTL_MS = 30 * 1000;
let cachedConfig = null;
let configLoadInFlight = null;
let hasWarnedAboutTightRadius = false;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const toFiniteNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const isValidLatitude = (value) => value !== null && value >= -90 && value <= 90;
const isValidLongitude = (value) => value !== null && value >= -180 && value <= 180;

/**
 * Great-circle distance between two coordinates, in meters (haversine).
 */
const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
};
const pickCoordinate = (fromSettings, fromEnv, validator) => {
  const settingsValue = toFiniteNumber(fromSettings);
  if (validator(settingsValue)) return settingsValue;

  const envValue = toFiniteNumber(fromEnv);
  return validator(envValue) ? envValue : null;
};

const pickRadius = (fromSettings, fromEnv) => {
  const isUsableRadius = (value) => value !== null && value > 0 && value <= 10000;

  const settingsValue = toFiniteNumber(fromSettings);
  if (isUsableRadius(settingsValue)) return settingsValue;

  const envValue = toFiniteNumber(fromEnv);
  return isUsableRadius(envValue) ? envValue : DEFAULT_RADIUS_M;
};

/**
 * Resolve the fence definition. Values saved in CafeSettings (admin editable)
 * win; environment variables act as a fallback for deployments that prefer to
 * configure the fence outside the database.
 */
const loadGeofenceConfig = async () => {
  let settings = null;

  try {
    settings = await CafeSettings.findOne().lean();
  } catch (error) {
    console.error(`[Geofence] Could not read cafe settings: ${error.message}`);
  }

  const radiusM = pickRadius(
    settings?.geofenceRadiusM,
    process.env.CAFE_GEOFENCE_RADIUS_M ?? process.env.CAFE_RADIUS_METERS,
  );

  const config = {
    enabled: settings?.geofenceEnabled !== false,
    latitude: pickCoordinate(
      settings?.geofenceLat,
      process.env.CAFE_LAT ?? process.env.CAFE_LATITUDE,
      isValidLatitude,
    ),
    longitude: pickCoordinate(
      settings?.geofenceLon,
      process.env.CAFE_LON ?? process.env.CAFE_LONGITUDE,
      isValidLongitude,
    ),
    radiusM,
  };

  // Consumer GPS indoors is rarely better than 50-100m, so a very small radius
  // rejects almost every real customer. Warn once so this does not repeat on
  // every config-cache refresh.
  if (config.latitude !== null && config.radiusM < 50 && !hasWarnedAboutTightRadius) {
    hasWarnedAboutTightRadius = true;
    console.warn(
      `[Geofence] Radius is ${config.radiusM}m. GPS accuracy indoors is typically 50-200m; ` +
        'consider 150-250m so customers are not locked out.',
    );
  }

  return config;
};

const getGeofenceConfig = async () => {
  if (cachedConfig && Date.now() - cachedConfig.loadedAt < CONFIG_CACHE_TTL_MS) {
    return cachedConfig.config;
  }

  if (!configLoadInFlight) {
    configLoadInFlight = loadGeofenceConfig()
      .then((config) => {
        cachedConfig = { config, loadedAt: Date.now() };
        return config;
      })
      .finally(() => {
        configLoadInFlight = null;
      });
  }

  return configLoadInFlight;
};

/**
 * Read and validate the position the browser reported. Anything unexpected is
 * rejected rather than coerced, so a malformed or tampered header can never be
 * silently interpreted as an in-range position.
 */
const readClientReading = (req, maxAccuracyM) => {
  const rawLat = req.get('x-client-lat');
  const rawLon = req.get('x-client-lon');

  // Separate 'header absent' from 'header unreadable' so the client can
  // tell the customer to grant permission versus to retry.
  const isAbsent = (raw) => raw === undefined || raw === null || raw === '';

  if (isAbsent(rawLat) || isAbsent(rawLon)) {
    return { ok: false, code: 'LOCATION_REQUIRED' };
  }

  const latitude = toFiniteNumber(rawLat);
  const longitude = toFiniteNumber(rawLon);
  const accuracyM = toFiniteNumber(req.get('x-client-accuracy'));
  const capturedAt = toFiniteNumber(req.get('x-client-geo-at'));

  if (latitude === null || longitude === null) {
    return { ok: false, code: 'LOCATION_INVALID' };
  }

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return { ok: false, code: 'LOCATION_INVALID' };
  }

  if (capturedAt === null || capturedAt > Date.now() + 60 * 1000) {
    // A wildly future timestamp means a broken or manipulated clock.
    return { ok: false, code: 'LOCATION_STALE' };
  }

  if (Date.now() - capturedAt > MAX_POSITION_AGE_MS) {
    return { ok: false, code: 'LOCATION_STALE' };
  }

  // A fix this coarse cannot distinguish inside from outside the fence.
  if (accuracyM !== null && accuracyM > maxAccuracyM) {
    return { ok: false, code: 'LOCATION_INACCURATE' };
  }

  return { ok: true, latitude, longitude, accuracyM };
};

const DENIAL_MESSAGES = {
  LOCATION_REQUIRED:
    'Allow location access to view the menu and place an order from inside the cafe.',
  LOCATION_INVALID: 'Your location could not be verified. Please try again.',
  LOCATION_STALE: 'Your location is out of date. Please try again.',
  LOCATION_INACCURATE: 'Your location signal is too weak. Please try again inside the cafe.',
  OUTSIDE_CAFE_AREA: 'Please open the menu while you are inside the cafe.',
  GEOFENCE_NOT_CONFIGURED:
    'The menu is temporarily unavailable. Please ask a member of staff for assistance.',
};

const deny = (res, code) =>
  res.status(403).json({
    success: false,
    code,
    message: DENIAL_MESSAGES[code],
  });

/**
 * Restrict customer menu/order traffic to devices physically inside the cafe.
 *
 * The fence must be registered BEFORE cacheMiddleware: that middleware keys
 * Redis on the request URL alone, so a gate placed after it would let an
 * out-of-range client read cached menu data straight from the cache.
 */
const requireGeofenceAccess = async (req, res, next) => {
  // A successfully authenticated administrator may use shared read endpoints
  // from another network without turning those endpoints into customer access.
  if (req.user) return next();

  const clientIp = normalizeIp(req.ip || req.socket?.remoteAddress);
  if (isLocalhostBypassEnabled() && isLocalhost(clientIp)) return next();

  const config = await getGeofenceConfig();

  if (!config.enabled) return next();

  if (config.latitude === null || config.longitude === null) {
    // Fail closed so a missing fence never silently publishes the menu.
    if (process.env.GEOFENCE_FAIL_OPEN === 'true') {
      console.error('[Geofence] No cafe location configured, but GEOFENCE_FAIL_OPEN is set. Allowing request.');
      return next();
    }

    console.error('[Geofence] No cafe location configured. Customer request denied.');
    return deny(res, 'GEOFENCE_NOT_CONFIGURED');
  }

  const maxAccuracyM =
    toFiniteNumber(process.env.CAFE_GEOFENCE_MAX_ACCURACY_M) || DEFAULT_MAX_ACCURACY_M;
  const reading = readClientReading(req, maxAccuracyM);

  if (!reading.ok) {
    console.warn(
      `[Geofence] Denied ${req.method} ${req.originalUrl || req.url} from ${clientIp || 'unknown IP'} (${reading.code})`,
    );
    return deny(res, reading.code);
  }

  const distanceM = getDistanceMeters(
    reading.latitude,
    reading.longitude,
    config.latitude,
    config.longitude,
  );

  if (distanceM <= config.radiusM) return next();

  // Keep the real coordinates in server logs only, so a misconfigured radius is
  // diagnosable without handing the cafe's exact location to the browser.
  console.warn(
    `[Geofence] Denied ${req.method} ${req.originalUrl || req.url} from ${clientIp || 'unknown IP'} — ` +
      `${Math.round(distanceM)}m from the cafe (allowed ${config.radiusM}m, accuracy ${reading.accuracyM ?? 'unknown'}m)`,
  );

  return deny(res, 'OUTSIDE_CAFE_AREA');
};

// Called by the admin settings update so a new fence takes effect immediately
// instead of after the cache window elapses.
const clearGeofenceConfigCache = () => {
  cachedConfig = null;
};
module.exports = {
  requireGeofenceAccess,
  clearGeofenceConfigCache,
  getDistanceMeters,
};

