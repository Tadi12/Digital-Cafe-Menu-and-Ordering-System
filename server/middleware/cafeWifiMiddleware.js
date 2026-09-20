const net = require('net');
const dns = require('dns').promises;

// Keep DNS traffic low while allowing a DDNS provider time to publish an IP
// change. Increase or decrease this if your provider's update/TTL policy calls
// for it.
const DDNS_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedApprovedIp = null;
let lastLookupAttemptAt = 0;
let lookupInFlight = null;

const LOCALHOST_ADDRESSES = new Set([
  '127.0.0.1',
  '0000:0000:0000:0000:0000:0000:0000:0001',
]);

// Express can return IPv4, IPv6, or IPv4-mapped IPv6 values depending on the
// host and reverse proxy. Convert them to one stable representation before
// comparing them with the address currently returned by CAFE_DDNS_HOST.
const normalizeIp = (address) => {
  if (!address || typeof address !== 'string') return null;

  let ip = address.trim().replace(/^\[|\]$/g, '').replace(/%.+$/, '');
  if (!ip) return null;

  if (net.isIP(ip) === 4) {
    return ip.split('.').map((part) => String(Number(part))).join('.');
  }

  // Convert the common IPv4-mapped IPv6 form directly to IPv4.
  const mappedMatch = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mappedMatch && net.isIP(mappedMatch[1]) === 4) {
    return normalizeIp(mappedMatch[1]);
  }

  if (net.isIP(ip) !== 6) return null;

  // Expand IPv6 so equivalent compressed spellings compare consistently.
  const halves = ip.toLowerCase().split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const groups = [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
  if (groups.length !== 8) return null;

  const expanded = groups.map((group) => group.padStart(4, '0')).join(':');
  const mappedPrefix = '0000:0000:0000:0000:0000:ffff:';
  if (expanded.startsWith(mappedPrefix)) {
    const hex = expanded.slice(mappedPrefix.length).split(':');
    return `${parseInt(hex[0], 16) >>> 8}.${parseInt(hex[0], 16) & 255}.${parseInt(hex[1], 16) >>> 8}.${parseInt(hex[1], 16) & 255}`;
  }

  return expanded;
};

const isLocalhost = (ip) => LOCALHOST_ADDRESSES.has(ip);

const resolveApprovedIp = async () => {
  const ddnsHost = process.env.CAFE_DDNS_HOST?.trim();

  if (!ddnsHost) {
    console.error('[Cafe Wi-Fi] CAFE_DDNS_HOST is not configured. Customer request denied.');
    return cachedApprovedIp;
  }

  // This timestamp also throttles retries during a DNS outage. The most
  // recently successful address remains usable while those retries fail.
  if (cachedApprovedIp && Date.now() - lastLookupAttemptAt < DDNS_CACHE_TTL_MS) {
    return cachedApprovedIp;
  }

  if (lookupInFlight) return lookupInFlight;

  lastLookupAttemptAt = Date.now();
  lookupInFlight = dns.lookup(ddnsHost)
    .then(({ address }) => {
      const resolvedIp = normalizeIp(address);
      if (!resolvedIp) {
        throw new Error(`CAFE_DDNS_HOST resolved to an invalid IP address: ${address}`);
      }

      cachedApprovedIp = resolvedIp;
      return cachedApprovedIp;
    })
    .catch((error) => {
      // Do not discard a known-good address because a transient DNS lookup
      // failed. Requests only fail closed until the first successful lookup.
      console.error(
        `[Cafe Wi-Fi] Could not resolve CAFE_DDNS_HOST (${ddnsHost}): ${error.message}. ${
          cachedApprovedIp ? 'Using the last successfully resolved IP.' : 'Customer request denied.'
        }`,
      );
      return cachedApprovedIp;
    })
    .finally(() => {
      lookupInFlight = null;
    });

  return lookupInFlight;
};

const requireCafeWifi = async (req, res, next) => {
  // A successfully authenticated administrator may use shared read endpoints
  // from another network without turning those endpoints into customer access.
  if (req.user) return next();

  const clientIp = normalizeIp(req.ip || req.socket?.remoteAddress);
  const allowLocalhost = process.env.ALLOW_LOCALHOST_MENU_ACCESS === 'true';

  if (allowLocalhost && isLocalhost(clientIp)) return next();

  const approvedIp = await resolveApprovedIp();

  if (!approvedIp) {
    // Fail closed outside the explicit local-development bypass. This avoids
    // accidentally publishing the menu when production configuration is absent.
    return res.status(403).json({
      success: false,
      code: 'CAFE_WIFI_REQUIRED',
      message: 'Please connect to the cafe’s Wi-Fi to access the menu and place an order.',
    });
  }

  if (clientIp && clientIp === approvedIp) return next();

  // Keep the real value in server logs only. This makes deployment/network
  // mismatches diagnosable without returning either IP to the browser.
  console.warn(
    `[Cafe Wi-Fi] Denied ${req.method} ${req.originalUrl || req.url} from ${clientIp || 'unknown IP'}`,
  );

  return res.status(403).json({
    success: false,
    code: 'CAFE_WIFI_REQUIRED',
    message: 'Please connect to the cafe’s Wi-Fi to access the menu and place an order.',
  });
};

module.exports = { requireCafeWifi, normalizeIp };
