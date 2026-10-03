const net = require('net');

const LOCALHOST_ADDRESSES = new Set([
  '127.0.0.1',
  '0000:0000:0000:0000:0000:0000:0000:0001',
]);

// Express can return IPv4, IPv6, or IPv4-mapped IPv6 values depending on the
// host and reverse proxy. Convert them to one stable representation so the
// local-development bypass compares consistently.
const normalizeIp = (address) => {
  if (!address || typeof address !== 'string') return null;

  let ip = address.trim().replace(/^\[|\]$/g, '').replace(/%+$/, '');
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

// Local development escape hatch. Enabled explicitly so a laptop on the cafe
// network (or a dev machine with no GPS) can still reach the menu.
const isLocalhostBypassEnabled = () => process.env.ALLOW_LOCALHOST_MENU_ACCESS === 'true';

module.exports = { normalizeIp, isLocalhost, isLocalhostBypassEnabled };
