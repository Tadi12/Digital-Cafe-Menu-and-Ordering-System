const mongoose = require('mongoose');
const dns = require('dns');

// An `mongodb+srv://` connection resolves the cluster through a DNS SRV lookup,
// so the resolver has to actually answer. Forcing public Google DNS breaks the
// connection on networks that block 8.8.8.8 (the SRV lookup then times out and
// the server exits before listening).
//
// Prefer the DNS_SERVERS list from .env when present, and otherwise leave the
// system resolver alone rather than overriding it with a possibly-blocked one.
const configuredServers = (process.env.DNS_SERVERS || '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

if (configuredServers.length > 0) {
  try {
    dns.setServers(configuredServers);
    console.log(`[DNS] Using configured resolvers: ${configuredServers.join(', ')}`);
  } catch (error) {
    console.warn(`[DNS] Could not apply DNS_SERVERS (${error.message}); using system defaults.`);
  }
} else {
  console.log('[DNS] No DNS_SERVERS set; using system resolver.');
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Surface a blocked/failed connection in seconds instead of leaving the
      // process hanging with no listener and no explanation.
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Error]: ${error.message}`);
    if (/ETIMEOUT|ENOTFOUND|querySrv/i.test(error.message)) {
      console.error(
        '[MongoDB Error] The SRV lookup failed. If DNS_SERVERS is set, confirm those ' +
          'resolvers are reachable, or remove DNS_SERVERS to use the system resolver.',
      );
    }
    process.exit(1);
  }
};

module.exports = connectDB;
