// Haversine formula to calculate distance between two coordinates in meters
const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Radius of the earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
};

const requireGeofence = (req, res, next) => {
  // Admins bypass the location check
  if (req.user) return next();

  // For local development bypass
  const allowLocalhost = process.env.ALLOW_LOCALHOST_MENU_ACCESS === 'true';
  const clientIp = req.ip || req.socket?.remoteAddress;
  if (allowLocalhost && (clientIp === '127.0.0.1' || clientIp === '::1')) return next();

  // Read the customer's coordinates from custom headers sent by the frontend
  const clientLat = parseFloat(req.headers['x-client-lat']);
  const clientLon = parseFloat(req.headers['x-client-lon']);

  // The Cafe's exact coordinates and allowed radius (configured in .env)
  // Defaults to a highly precise 15 meters if not set
  const CAFE_LAT = parseFloat(process.env.CAFE_LATITUDE);
  const CAFE_LON = parseFloat(process.env.CAFE_LONGITUDE);
  const ALLOWED_RADIUS = parseFloat(process.env.CAFE_RADIUS_METERS) || 15;

  if (!CAFE_LAT || !CAFE_LON) {
    console.error('[Geofence] CAFE_LATITUDE and CAFE_LONGITUDE not configured.');
    return next(); // Fail open if the cafe owner hasn't set up coordinates yet
  }

  if (isNaN(clientLat) || isNaN(clientLon)) {
    return res.status(403).json({
      success: false,
      code: 'LOCATION_REQUIRED',
      message: 'Please enable location services to view the menu and place an order.',
    });
  }

  const distance = getDistanceFromLatLonInMeters(CAFE_LAT, CAFE_LON, clientLat, clientLon);

  if (distance > ALLOWED_RADIUS) {
    console.warn(`[Geofence] Denied access. Customer is ${distance.toFixed(2)} meters away.`);
    return res.status(403).json({
      success: false,
      code: 'OUT_OF_RANGE',
      message: `You appear to be ${Math.round(distance)} meters away. You must be inside the cafe to order.`,
    });
  }

  next();
};

module.exports = { requireGeofence, getDistanceFromLatLonInMeters };
