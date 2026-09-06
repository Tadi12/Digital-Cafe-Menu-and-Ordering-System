/**
 * Play a custom notification sound if configured, otherwise fall back to a
 * built-in chime generated with the Web Audio API.
 */
const playDefaultChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    const playTone = (freq, type, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    // Chime sequence: C5 -> E5 -> G5
    playTone(523.25, 'sine', 0, 0.2);
    playTone(659.25, 'sine', 0.15, 0.2);
    playTone(783.99, 'sine', 0.3, 0.4);
  } catch (error) {
    console.warn('[Sound Notification Warning]:', error.message);
  }
};

export const playNotificationSound = (customSoundUrl) => {
  try {
    const soundUrl = customSoundUrl || import.meta.env.VITE_NOTIFICATION_SOUND_URL || '/sounds/admin-notification.wav';

    if (soundUrl && soundUrl !== 'false') {
      const audio = new Audio(soundUrl);
      audio.volume = 0.8;
      audio.play().catch(() => playDefaultChime());
      return;
    }
  } catch (error) {
    console.warn('[Sound Notification Warning]:', error.message);
  }

  playDefaultChime();
};
