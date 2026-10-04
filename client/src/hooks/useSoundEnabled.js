import { useCallback, useEffect, useState } from 'react';
import {
  readSoundEnabled,
  writeSoundEnabled,
  SOUND_ENABLED_EVENT,
} from '../utils/soundPreference';

/**
 * Shared mute switch for staff notification sounds.
 *
 * @param {boolean}   initial
 * @param {Function}  onToggle receives the next value
 * @returns {[boolean, Function]} `[soundEnabled, setSoundEnabled]`
 */
export const useSoundEnabled = (initial = readSoundEnabled(), onToggle) => {
  const [soundEnabled, setEnabled] = useState(initial);

  // Keep this instance in step with the others when either one is toggled.
  useEffect(() => {
    const sync = () => setEnabled(readSoundEnabled());
    window.addEventListener(SOUND_ENABLED_EVENT, sync);
    return () => window.removeEventListener(SOUND_ENABLED_EVENT, sync);
  }, []);

  const setSoundEnabled = useCallback(
    (next) => {
      setEnabled((prev) => {
        const value = typeof next === 'function' ? next(prev) : next;
        writeSoundEnabled(value);
        onToggle?.(value);
        return value;
      });
    },
    [onToggle],
  );

  return [soundEnabled, setSoundEnabled];
};

export default useSoundEnabled;