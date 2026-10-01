import axiosClient from '../api/axiosClient';
import { claimTableApi, heartbeatTableApi } from '../api/tableApi';

// Keeps the customer's exclusive claim on a table alive for as long as the
// menu (or any customer page) is open in this browser.
//
// - The heartbeat runs at module level on purpose: it must survive SPA
//   navigation (menu -> order confirmation -> tracker) so the table does not
//   free up while the guest is still seated.
// - If the claim is lost (expired and taken by someone else, or table made
//   inactive), `onLost` is invoked so the UI can show the waiting screen.
// - When the tab/page is closed or refreshed, the claim is released with
//   navigator.sendBeacon so the next guest can scan immediately. Anything
//   that survives that (crash, lost network) is covered by the server TTL.

const HEARTBEAT_INTERVAL_MS = 60 * 1000;

let currentTableId = null;
let currentSessionId = null;
let onLostCallback = null;
let heartbeatTimer = null;

const isBrowser = typeof window !== 'undefined';

const releaseUrl = (tableId) =>
  axiosClient.getUri({ url: `/tables/${tableId}/release` });

const releaseViaBeacon = (tableId, sessionId) => {
  if (!isBrowser) return;
  try {
    const url = releaseUrl(tableId);
    const body = JSON.stringify({ customerSessionId: sessionId });

    if (navigator.sendBeacon) {
      // Blob with an explicit JSON content type so express.json() parses it.
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(url, blob)) return;
    }

    // Fallback for browsers without sendBeacon: keepalive lets the request
    // outlive the page teardown.
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch (err) {
    // Best effort only — the server-side TTL frees the table regardless.
    console.warn('[Table Session] Release beacon failed:', err);
  }
};

const clearHeartbeat = () => {
  if (heartbeatTimer) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
};

const runHeartbeat = async () => {
  if (!currentTableId || !currentSessionId) return;

  try {
    await heartbeatTableApi(currentTableId, currentSessionId);
  } catch (err) {
    const status = err.response?.status;
    if (status !== 409) {
      // Transient network trouble: keep the existing claim and let the next
      // beat (or the server TTL) sort it out.
      return;
    }

    // Claim lost or table taken. Try to take it back — this succeeds when
    // the table became free again (our TTL expired first) and fails when
    // another guest now holds it.
    try {
      await claimTableApi(currentTableId, currentSessionId);
    } catch (claimErr) {
      const claimStatus = claimErr.response?.status;
      if (claimStatus === 409 || claimStatus === 400 || claimStatus === 404) {
        clearHeartbeat();
        onLostCallback?.(claimErr);
      }
    }
  }
};

const startHeartbeat = () => {
  if (!isBrowser) return;
  clearHeartbeat();
  heartbeatTimer = window.setInterval(runHeartbeat, HEARTBEAT_INTERVAL_MS);
};

/**
 * Begin (or retarget) the occupancy session for a table.
 * Idempotent: calling it again simply switches to the new table/session.
 */
export const startTableSession = ({
  tableId,
  customerSessionId,
  onLost,
} = {}) => {
  if (!tableId || !customerSessionId) return;

  currentTableId = String(tableId);
  currentSessionId = String(customerSessionId);
  onLostCallback = typeof onLost === 'function' ? onLost : null;

  startHeartbeat();
};

/**
 * Stop heartbeating without releasing the table (the claim then expires on
 * its own after the server TTL).
 */
export const stopTableSession = () => {
  clearHeartbeat();
  currentTableId = null;
  currentSessionId = null;
  onLostCallback = null;
};

if (isBrowser) {
  // Fires on tab close, refresh, and bfcache navigation away from the page.
  window.addEventListener('pagehide', (event) => {
    if (!currentTableId || !currentSessionId) return;

    if (event.persisted) {
      // Page is being frozen into the back/forward cache: keep the claim but
      // pause timers; pageshow resumes them.
      clearHeartbeat();
      return;
    }

    releaseViaBeacon(currentTableId, currentSessionId);
    stopTableSession();
  });

  window.addEventListener('pageshow', (event) => {
    if (!event.persisted || !currentTableId) return;
    startHeartbeat();
    runHeartbeat();
  });

  // Regain focus (tab switch, phone unlock): renew immediately instead of
  // waiting for the next tick, since background timers may be throttled.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentTableId) {
      runHeartbeat();
    }
  });
}
