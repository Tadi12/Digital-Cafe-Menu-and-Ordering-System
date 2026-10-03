// Browser geolocation support for the cafe geofence.
//
// Positions are cached with the time they were captured so a customer who was
// inside, left, and kept the tab open cannot keep replaying an old fix. The
// server independently rejects readings older than its own window, so this
// cache is an optimisation, not the security boundary.

const STORAGE_KEY = 'cafe_client_geo';

// Refresh a little more often than the server's staleness window so the header
// timestamp is always fresh enough to be accepted.
const FRESH_FOR_MS = 60 * 1000;

const POSITION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 30000,
};

// Clear the legacy single-value keys so an old browser profile cannot keep
// sending coordinates from the previous format.
const LEGACY_KEYS = ['cafe_client_lat', 'cafe_client_lon'];

let memoryCache = null;
let inFlight = null;

const isFresh = (entry) => Boolean(entry?.at) && Date.now() - entry.at < FRESH_FOR_MS;

const readFromStorage = () => {
  if (memoryCache) return memoryCache;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.lat !== 'number' ||
      typeof parsed?.lon !== 'number' ||
      typeof parsed?.at !== 'number'
    ) {
      return null;
    }

    memoryCache = parsed;
    return memoryCache;
  } catch {
    // A corrupt entry should never break the menu; just re-read it next time.
    return null;
  }
};

const writeToStorage = (entry) => {
  memoryCache = entry;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Private browsing or a full quota: keep the in-memory copy for this page.
  }
};

export const clearCachedCoordinates = () => {
  memoryCache = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
};

/**
 * Last known position, used to attach coordinates to outgoing API requests.
 * Returns null until a position has been captured.
 */
export const getCachedCoordinates = () => readFromStorage();

/**
 * Ask the browser for a position.
 * Resolves to `{ ok: true, position }` or `{ ok: false, reason }` where reason
 * is one of: unsupported | insecure | denied | unavailable | timeout.
 */
export const requestCurrentPosition = () => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ ok: false, reason: 'unsupported' });
  }

  // Geolocation is only exposed to secure origins. localhost counts as secure,
  // so plain-HTTP development still works.
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return Promise.resolve({ ok: false, reason: 'insecure' });
  }

  if (inFlight) return inFlight;

  inFlight = new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (coords) => {
        const entry = {
          lat: coords.coords.latitude,
          lon: coords.coords.longitude,
          accuracy: coords.coords.accuracy,
          at: Date.now(),
        };

        writeToStorage(entry);
        resolve({ ok: true, position: entry });
      },
      (error) => {
        const reason =
          error?.code === 1
            ? 'denied'
            : error?.code === 3
              ? 'timeout'
              : 'unavailable';
        resolve({ ok: false, reason, details: error?.message, code: error?.code });
      },
      POSITION_OPTIONS,
    );
  }).finally(() => {
    inFlight = null;
  });

  return inFlight;
};

/**
 * Return a position that is fresh enough to send with a request, requesting a
 * new one when the cached fix has aged out.
 */
export const ensureFreshCoordinates = async ({ force = false } = {}) => {
  const cached = readFromStorage();

  if (!force && isFresh(cached)) {
    return { ok: true, position: cached };
  }

  return requestCurrentPosition();
};
