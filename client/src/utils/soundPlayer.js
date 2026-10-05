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
 * The waiter call repeats: a waiter is usually across the room, past the
 * grinder, with no screen in sight. One short clip gets missed.
 */
const WAITER_SOUND_TIMES = 3;
const WAITER_SOUND_GAP_MS = 1800;

/**
 * Upper bound on how long one clip is assumed to run before the repeat chain stops
 * waiting for it. Generous — the longest bundled clip is under 6s — because this
 * only ever fires when `ended` never arrives, and it must not cut a real clip short.
 */
const MAX_CLIP_MS = 30000;

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
 * Plays `soundUrl`, optionally repeating it.
 *
 * Repeats are SEQUENCED ON THE `ended` EVENT, never on a fixed timer. This used to
 * be `setTimeout(pass * gapMs)`, which assumed every clip was shorter than the gap.
 * None of them are: the shortest bundled clip is 2.97s against a 1.8s gap, and the
 * spoken customer-call clip is 4.65s — so the second copy started while the first was
 * still speaking and the two played on top of each other. That is the "echoing" a
 * caller hears: not two events, but one event's own repeats colliding. Waiting for
 * `ended` makes the mechanism correct for any clip length, present or future.
 *
 * Chimes once (not per repeat) when the browser refuses playback, so a blocked alert
 * still makes some noise.
 */
const playAudioFile = (soundUrl, { volume = 0.8, times = 1, gapMs = 0 } = {}) => {
  let failures = 0;

  const chimeOnce = (error) => {
    failures += 1;
    console.warn('[Sound Notification Warning]:', error.message);
    // Once, not `times` times: the fallback exists to prove the device can make a
    // sound at all, and the whole point of this function is to stop stacking copies.
    if (failures === 1) playDefaultChime();
  };

  /** Play the clip once, then call `done`. `done` always runs exactly once. */
  const playOnce = (done) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      done();
    };

    // Safety net for the case `ended` never arrives — an undecodable file, a codec
    // the browser will not measure, or playback that never starts. Without it a
    // single silent failure would swallow every remaining repeat.
    const guard = window.setTimeout(finish, MAX_CLIP_MS);

    try {
      const audio = new Audio(soundUrl);
      audio.volume = volume;

      audio.addEventListener('ended', () => {
        window.clearTimeout(guard);
        finish();
      });
      audio.addEventListener('error', () => {
        window.clearTimeout(guard);
        chimeOnce(new Error(`could not play ${soundUrl}`));
        finish();
      });

      const played = audio.play();
      if (played && typeof played.catch === 'function') {
        played.catch((error) => {
          window.clearTimeout(guard);
          chimeOnce(error);
          finish();
        });
      }
    } catch (error) {
      window.clearTimeout(guard);
      chimeOnce(error);
      finish();
    }
  };

  const runPass = (pass) => {
    if (pass >= times) return;
    playOnce(() => {
      if (pass + 1 >= times) return;
      // Measured from the END of the clip, so the gap is silence between repeats
      // rather than a deadline that a long clip sails straight past.
      window.setTimeout(() => runPass(pass + 1), gapMs);
    });
  };

  runPass(0);
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
 *   event             clip           repeat  who hears it
 *   ----------------  -------------  ------  ------------------------------------------------
 *   order_ready       waiter         3       the floor: the chef/barista finished a track
 *   customer_called   callWaiter     1       the floor: a guest pressed the bell
 *   new_order         newOrder       1       the kitchen: a new ticket to prepare
 *
 * Only the short attention chime repeats. `customer_called` is a 4.65s SPOKEN
 * announcement, and repeating it is not "being heard more often" — it is three
 * overlapping sentences or nine near-identical ones, which is unintelligible and
 * sounds like a fault. Speech is self-evidently an announcement, so it plays once and
 * is heard once. The repeats exist for a chime that can be missed across a room, not
 * for someone talking.
 *
 * `new_order` also lists management, which is not in the stated rule. They already
 * received it before this table existed — they join `admin_room`, which the order
 * controller broadcasts to — and silencing an alert somebody already relies on is a
 * product decision rather than a refactor. Say the word and it comes out.
 */
const SOUND_MATRIX = {
  order_ready: { clip: 'waiter', repeat: WAITER_SOUND_TIMES, recipients: FLOOR_ROLES },
  customer_called: { clip: 'callWaiter', repeat: 1, recipients: FLOOR_ROLES },
  new_order: { clip: 'newOrder', repeat: 1, recipients: [...KITCHEN_ROLES, 'admin', 'super_admin'] },
};

/**
 * The clip a role should hear for an event, or null when it should stay silent.
 *
 * @param {string} event one of the SOUND_MATRIX keys
 * @param {string} role  the signed-in staff role
 * @returns {{clip: string, repeat: number}|null}
 */
export const soundForEvent = (event, role) => {
  const rule = SOUND_MATRIX[event];
  if (!rule) return null;
  if (!rule.recipients.includes(role)) return null;
  return { clip: rule.clip, repeat: rule.repeat };
};

/**
 * Play the sound the matrix says this role should hear for this event.
 *
 * Callers no longer decide whether a role should hear something; they just report
 * what happened and let the table answer. An unknown event, or one this role is not
 * a recipient of, is a silent no-op rather than a wrong noise.
 *
 * @param {string} event
 * @param {string} role
 * @param {{volume?: number, times?: number, gapMs?: number}} [options]
 * @returns {boolean} whether anything was played
 */
export const playEventSound = (event, role, options = {}) => {
  const rule = soundForEvent(event, role);
  if (!rule) return false;

  playNotificationSound(rule.clip, {
    volume: rule.clip === 'newOrder' ? 0.8 : 1,
    times: rule.repeat,
    gapMs: rule.repeat > 1 ? WAITER_SOUND_GAP_MS : 0,
    ...options,
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
