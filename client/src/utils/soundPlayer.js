/**
 * Notification sounds for the customer menu and the staff console.
 *
 * Three clips ship in client/public/sounds:
 *
 *   new-order-notification.mp3  a new order landed (chef and the counter)
 *   customer-notification.mp3  the customer's own order became ready
 *   Waiter_notification.m4a    the floor needs a waiter — an order is ready to
 *                              be served, or a table pressed "call waiter"
 *
 * Every clip has a VITE_*_NOTIFICATION_SOUND_URL override so a deployment can
 * swap it without a rebuild, and each one falls back to a chime built with the
 * Web Audio API when the file is missing or the browser refuses to play it.
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
};

/** Per-preset env override, read by resolveSoundUrl(). */
const SOUND_ENV_KEYS = {
  newOrder: 'VITE_NEW_ORDER_NOTIFICATION_SOUND_URL',
  customer: 'VITE_CUSTOMER_NOTIFICATION_SOUND_URL',
  waiter: 'VITE_WAITER_NOTIFICATION_SOUND_URL',
};

/** Catch-all override, honoured for callers that pass a bare URL. */
const LEGACY_SOUND_ENV_KEY = 'VITE_NOTIFICATION_SOUND_URL';

/**
 * The waiter call repeats: a waiter is usually across the room, past the
 * grinder, with no screen in sight. One short clip gets missed.
 */
const WAITER_SOUND_TIMES = 3;
const WAITER_SOUND_GAP_MS = 1800;

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

const playDefaultChime = ({ times = 1, gapMs = 0 } = {}) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    for (let pass = 0; pass < times; pass += 1) {
      const passOffset = (pass * gapMs) / 1000;
      CHIME_TONES.forEach(({ freq, type, offset, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startAt = ctx.currentTime + passOffset + offset;

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startAt);
        gain.gain.setValueAtTime(0.15, startAt);
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startAt);
        osc.stop(startAt + duration);
      });
    }
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
 * Plays `soundUrl`, optionally repeating it. Chimes once (not per repeat) when
 * the browser refuses playback, so a blocked alert still makes some noise.
 */
const playAudioFile = (soundUrl, { volume = 0.8, times = 1, gapMs = 0 } = {}) => {
  let failures = 0;

  for (let pass = 0; pass < times; pass += 1) {
    window.setTimeout(() => {
      const chimeOnce = (error) => {
        failures += 1;
        console.warn('[Sound Notification Warning]:', error.message);
        if (failures === 1) playDefaultChime({ times, gapMs });
      };

      try {
        const audio = new Audio(soundUrl);
        audio.volume = volume;
        const played = audio.play();
        if (played && typeof played.catch === 'function') {
          played.catch(chimeOnce);
        }
      } catch (error) {
        chimeOnce(error);
      }
    }, pass * gapMs);
  }
};

/**
 * Play a notification sound.
 *
 * @param {string} [target] 'newOrder' | 'customer' | 'waiter', a URL, or nothing
 *                            for the legacy default. Pass 'false' (or set the
 *                            env var to it) to force the chime only.
 * @param {{volume?: number, times?: number, gapMs?: number}} [options]
 */
export const playNotificationSound = (target, options) => {
  ensureAudioUnlocked();

  const soundUrl = resolveSoundUrl(target);
  if (!soundUrl || soundUrl === 'false') {
    playDefaultChime(options);
    return;
  }

  playAudioFile(soundUrl, options);
};

/**
 * The floor alert: an order is ready to be served, or a table called the waiter.
 * Repeats at full volume so it is heard away from the till.
 *
 * @param {{volume?: number, times?: number, gapMs?: number}} [options]
 */
export const playWaiterNotificationSound = (options) => {
  playNotificationSound('waiter', {
    volume: 1,
    times: WAITER_SOUND_TIMES,
    gapMs: WAITER_SOUND_GAP_MS,
    ...options,
  });
};

export { playDefaultChime };
