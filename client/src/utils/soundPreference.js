/**
 * Persisted on/off switch for the staff notification sounds.
 *
 * The order screen owns the mute button, so the choice is written to
 * localStorage and announced on a window event: muting on the orders screen
 * silences the alerts the navbar plays on the dashboard too, without a reload.
 */

export const SOUND_ENABLED_KEY = 'cafe_order_sound_enabled';
export const SOUND_ENABLED_EVENT = 'cafe-sound-enabled-changed';

/** @returns {boolean} whether staff alert sounds are switched on. */
export const readSoundEnabled = () => {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(SOUND_ENABLED_KEY) !== 'off';
};

/**
 * @param {boolean} enabled
 * @returns {boolean} the value that was stored
 */
export const writeSoundEnabled = (enabled) => {
  if (typeof window === 'undefined') return enabled;
  window.localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'on' : 'off');
  window.dispatchEvent(new Event(SOUND_ENABLED_EVENT));
  return enabled;
};

export default readSoundEnabled;