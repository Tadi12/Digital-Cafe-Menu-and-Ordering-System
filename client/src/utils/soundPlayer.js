/**
 * Notification sounds for the customer menu and the staff console.
 *
 * Three clips ship in client/public/sounds:
 *
 *   new-order-notification.mp3  a new order landed (chef and the counter)
 *   customer-notification.mp3  the customer's own order became ready
 *   Waiter_notification.m4a    the floor needs a waiter — an order is ready to
 *                              be served, or a table pressed "call waiter"
 *   Call_Waiter_voice.m4a     a guest pressed the bell, spoken to the FLOOR
 *
 * Every clip has a VITE_*_SOUND_URL override so a deployment can swap it without a
 * rebuild, and each one falls back to a chime built with the Web Audio API when the
 * file is missing or the browser refuses to play it.
 *
 * A path in client/.env and a filename in client/public must agree EXACTLY,
 * including capitalisation. A development machine resolves them case-insensitively,
 * so a mismatch looks fine locally and 404s on the Linux host in production — and
 * because the fallback is a chime rather than an error, it fails quietly.
 *
 * Browsers block audio until the page has seen a user gesture, so the first
 * play request installs pointer/key listeners that resume a shared
 * AudioContext. Without that a waiter who has only just logged in would hear
 * nothing at all on their first alert.
 */

/** Bundled clips, resolved relative to client/public. */
export const SOUND_URLS = {
  newOrder: '/sounds/new-order-notification.mp3',
  customer: '/sounds/customer-notification.mp3',
  waiter: '/sounds/Waiter_notification.m4a',
  // The FLOOR alert for a guest pressing the bell. Deliberately a different clip
  // from `waiter`: "a plate is ready" and "a guest is waiting" are different jobs
  // and a waiter reacts to them differently, so they must not be the same sound.
  //
  // It is the spoken "dear waiter, customer is calling for you" and it plays on the
  // STAFF device that has to act — never on the guest's. See the note at the bottom
  // of this file.
  callWaiter: '/sounds/Call_Waiter_voice.m4a',
};

/** Per-preset env override, read by resolveSoundUrl(). */
const SOUND_ENV_KEYS = {
  newOrder: 'VITE_NEW_ORDER_NOTIFICATION_SOUND_URL',
  customer: 'VITE_CUSTOMER_NOTIFICATION_SOUND_URL',
  waiter: 'VITE_WAITER_NOTIFICATION_SOUND_URL',
  // Named for the .env contract, not for this file's internals: the deployment
  // already defines VITE_CALL_WAITER_SOUND_URL, and a key that is present in
  // client/.env but spelled differently here is silently ignored — Vite inlines
  // every VITE_ var into the bundle whether or not the code reads it, so the
  // mismatch produces no error, just the fallback path playing.
  callWaiter: 'VITE_CALL_WAITER_SOUND_URL',
};

/** Catch-all override, honoured for callers that pass a bare URL. */
const LEGACY_SOUND_ENV_KEY = 'VITE_NOTIFICATION_SOUND_URL';

/**
 * How long one floor alert stays claimed, in ms.
 *
 * A guest ringing the bell once must produce ONE announcement per device. The
 * staff console is normally left open in more than one tab (dashboard, orders,
 * tables), and every tab holds its own socket and its own handler, so the same
 * `waiter_called` event lands in each of them: three tabs meant the same bell was
 * announced three times, which a waiter hears as the sound repeating itself.
 *
 * The claim lives in localStorage rather than in a module variable precisely
 * because of that: a module variable is per-tab and would collapse nothing.
 *
 * It is deliberately shorter than the guest's own 15s cooldown between rings
 * (RING_COOLDOWN_MS in CallWaiterButton.jsx), so a guest who rings again because
 * nobody came is never silenced, and it is keyed per table, so two different
 * tables calling within the same second are both announced.
 */
const EVENT_DEDUPE_MS = 5000;
const EVENT_DEDUPE_STORAGE_KEY = 'cafe_last_announced_alert';

/**
 * Claim the right to announce one event, or report that it was already announced.
 *
 * Deliberately fails OPEN: if localStorage is unavailable (private mode, quota,
 * a locked-down browser) the alert still plays, because a missing announcement is
 * a worse failure than a repeated one.
 *
 * @param {string} key identifies the alert — event name plus its own id
 * @returns {boolean} true when this caller is the one that should make the noise
 */
const claimEventAnnouncement = (key) => {
  if (typeof window === 'undefined') return true;
  const now = Date.now();

  let claimed = {};
  try {
    const raw = window.localStorage.getItem(EVENT_DEDUPE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') claimed = parsed;
  } catch {
    claimed = {};
  }

  if (now - (Number(claimed[key]) || 0) < EVENT_DEDUPE_MS) return false;

  claimed[key] = now;
  try {
    window.localStorage.setItem(EVENT_DEDUPE_STORAGE_KEY, JSON.stringify(claimed));
  } catch {
    // Nothing to do: see the note above about failing open.
  }
  return true;
};

// ---------------------------------------------------------------------------
// Autoplay unlocking
// ---------------------------------------------------------------------------

let audioContext = null;
let gestureListenersBound = false;
let hasUserGesture = false;

const getAudioContext = () => {
  if (audioContext) return audioContext;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  audioContext = new AudioContextCtor();
  return audioContext;
};

/**
 * Chrome, Safari and Firefox all refuse audio until a real user gesture. The
 * staff console opens straight after a login tap, so bind the listeners on the
 * first play request and resume the shared context once any interaction lands.
 */
const ensureAudioUnlocked = () => {
  if (typeof window === 'undefined') return;
  if (!gestureListenersBound) {
    gestureListenersBound = true;
    ['pointerdown', 'keydown', 'touchstart'].forEach((eventName) =>
      window.addEventListener(
        eventName,
        () => {
          hasUserGesture = true;
        },
        { passive: true },
      ),
    );
  }
  const ctx = getAudioContext();
  if (ctx?.state === 'suspended' && hasUserGesture) ctx.resume().catch(() => {});
};

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------

/** Synthesised stand-in for the bundled clips: C5 -> E5 -> G5. */
const CHIME_TONES = [
  { freq: 523.25, type: 'sine', offset: 0, duration: 0.2 },
  { freq: 659.25, type: 'sine', offset: 0.15, duration: 0.2 },
  { freq: 783.99, type: 'sine', offset: 0.3, duration: 0.4 },
];

const playDefaultChime = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    CHIME_TONES.forEach(({ freq, type, offset, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startAt = ctx.currentTime + offset;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startAt);
      gain.gain.setValueAtTime(0.15, startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startAt);
      osc.stop(startAt + duration);
    });
  } catch (error) {
    console.warn('[Sound Notification Warning]:', error.message);
  }
};

/**
 * @param {string} [target] a key of SOUND_URLS, a direct URL, or nothing
 * @returns {string} the clip to play
 */
const resolveSoundUrl = (target) => {
  if (SOUND_URLS[target]) {
    return import.meta.env[SOUND_ENV_KEYS[target]] || SOUND_URLS[target];
  }
  // An explicit URL wins, then the legacy catch-all env, then the customer clip.
  return (
    target || import.meta.env[LEGACY_SOUND_ENV_KEY] || SOUND_URLS.customer
  );
};

/**
 * Plays `soundUrl` exactly once.
 *
 * It used to be able to repeat the clip, sequenced on the `ended` event with a gap
 * between passes, because a waiter is usually across the room and a short attention
 * chime can be missed. Repeating turned out to be the wrong answer twice over: the
 * gap was shorter than every bundled clip, so copies overlapped into an unintelligible
 * pile, and a second event arriving during the repeats stacked on top of them. What
 * a waiter actually needs is the notification itself and the on-screen banner, which
 * persist — so no alert repeats any more, and the mechanism went with it.
 *
 * Chimes once when the browser refuses playback, so a blocked alert still makes some
 * noise instead of failing silently.
 */
const playAudioFile = (soundUrl, { volume = 0.8 } = {}) => {
  let chimed = false;

  /** Prove the device can make a sound at all, exactly once per failed request. */
  const chimeOnce = (error) => {
    if (chimed) return;
    chimed = true;
    console.warn('[Sound Notification Warning]:', error.message);
    playDefaultChime();
  };

  try {
    const audio = new Audio(soundUrl);
    audio.volume = volume;

    audio.addEventListener('error', () => {
      chimeOnce(new Error(`could not play ${soundUrl}`));
    });

    const played = audio.play();
    if (played && typeof played.catch === 'function') {
      played.catch(chimeOnce);
    }
  } catch (error) {
    chimeOnce(error);
  }
};

/**
 * Play a notification sound.
 *
 * @param {string} [target] 'newOrder' | 'customer' | 'waiter' | 'callWaiter', a URL,
 *                            or nothing for the legacy default. Pass 'false' (or set
 *                            the env var to it) to force the chime only.
 * @param {{volume?: number}} [options]
 */
export const playNotificationSound = (target, options) => {
  ensureAudioUnlocked();

  const soundUrl = resolveSoundUrl(target);
  if (!soundUrl || soundUrl === 'false') {
    playDefaultChime();
    return;
  }

  playAudioFile(soundUrl, options);
};

// ---------------------------------------------------------------------------
// Who hears what
// ---------------------------------------------------------------------------

/** Can carry an order to the table, or answer a guest. Mirrors isFloorStaffRole. */
const FLOOR_ROLES = ['waiter', 'admin', 'super_admin'];

/** Prepare one half of an order. Never hears floor traffic. */
const KITCHEN_ROLES = ['chef', 'barista'];

/**
 * The whole sound matrix: (event, recipient) -> which clip plays.
 *
 * This table is the answer to "who should hear what", in one readable place,
 * because the alternative is the rule being re-derived at each socket handler —
 * which is exactly how a guest pressing the bell ended up playing the same clip as
 * the kitchen announcing a plate was ready. Two different jobs, one sound, and a
 * waiter cannot tell them apart by ear.
 *
 *   event             clip           who hears it
 *   ----------------  -------------  ------------------------------------------------
 *   order_ready       waiter         the floor: the chef/barista finished a track
 *   customer_called   callWaiter     the floor: a guest pressed the bell
 *   new_order         newOrder       the kitchen: a new ticket to prepare
 *
 * NO EVENT REPEATS. Each one plays once, once per device.
 *
 * The repeats were only ever justified for the short attention chime, on the theory
 * that a waiter across the room would miss it. In practice they cost more than they
 * bought: every bundled clip is longer than the gap between passes, so the copies
 * overlapped into noise; and the two events a busy table generates in a few seconds
 * stacked on top of each other, which is the repetitive ringing that prompted this.
 * A dropped alert is recoverable — the notification badge and the banner stay until
 * they are acted on — whereas a sound that repeats three times is indistinguishable
 * from a fault and gets tuned out, which is the worse failure.
 *
 * One play per event is necessary but not sufficient for "one event, one sound": the
 * same event reaches every open console tab, and each tab holds its own handler.
 * playEventSound therefore also claims the event per device — see EVENT_DEDUPE_MS.
 *
 * `new_order` also lists management, which is not in the stated rule. They already
 * received it before this table existed — they join `admin_room`, which the order
 * controller broadcasts to — and silencing an alert somebody already relies on is a
 * product decision rather than a refactor. Say the word and it comes out.
 */
const SOUND_MATRIX = {
  order_ready: { clip: 'waiter', recipients: FLOOR_ROLES },
  customer_called: { clip: 'callWaiter', recipients: FLOOR_ROLES },
  new_order: { clip: 'newOrder', recipients: [...KITCHEN_ROLES, 'admin', 'super_admin'] },
};

/**
 * The clip a role should hear for an event, or null when it should stay silent.
 *
 * @param {string} event one of the SOUND_MATRIX keys
 * @param {string} role  the signed-in staff role
 * @returns {{clip: string}|null}
 */
export const soundForEvent = (event, role) => {
  const rule = SOUND_MATRIX[event];
  if (!rule) return null;
  if (!rule.recipients.includes(role)) return null;
  return { clip: rule.clip };
};

/**
 * Play the sound the matrix says this role should hear for this event.
 *
 * Callers no longer decide whether a role should hear something; they just report
 * what happened and let the table answer. An unknown event, or one this role is not
 * a recipient of, is a silent no-op rather than a wrong noise.
 *
 * The event is announced at most once per device per EVENT_DEDUPE_MS, which is what
 * makes one guest bell press produce one announcement rather than one per open
 * console tab. `dedupeKey` is the event's own id (a table number, an order id), so
 * that claim never swallows a DIFFERENT alert that happens to arrive moments later.
 *
 * @param {string} event
 * @param {string} role
 * @param {{volume?: number, dedupeKey?: string|number}} [options]
 * @returns {boolean} whether anything was played
 */
export const playEventSound = (event, role, options = {}) => {
  const rule = soundForEvent(event, role);
  if (!rule) return false;

  const { dedupeKey, ...playOptions } = options;
  if (!claimEventAnnouncement(`${event}:${dedupeKey ?? ''}`)) return false;

  playNotificationSound(rule.clip, {
    volume: rule.clip === 'newOrder' ? 0.8 : 1,
    ...playOptions,
  });
  return true;
};

// ---------------------------------------------------------------------------
// Note: nothing here plays for the guest who pressed the bell
// ---------------------------------------------------------------------------
//
// There is deliberately NO customer-side sound for a call-waiter. A guest asking for
// attention does not need to be told they asked for it — that is noise added to a
// table conversation — so the acknowledgement is the toast and the spinner, both
// visual. The spoken "dear waiter, customer is calling for you" clip is the STAFF
// side of the same interaction, reached through the `customer_called` row above and
// played on a device belonging to somebody who has to do something about it.
//
// A voiceover player used to live here, preloading that clip for the guest's own
// device. It was removed rather than left dormant: an unused player, a placeholder
// audio file and a recording spec for a feature the product must not ship is three
// things for the next person to puzzle over.

export { playDefaultChime };
