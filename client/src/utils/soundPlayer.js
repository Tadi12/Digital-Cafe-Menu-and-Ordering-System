/**
 * Play pleasant chime notification sound using Web Audio API (no external asset file needed)
 */
export const playNotificationSound = () => {
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

    // Chime sequence: C5 (523.25Hz) -> E5 (659.25Hz) -> G5 (783.99Hz)
    playTone(523.25, 'sine', 0, 0.2);
    playTone(659.25, 'sine', 0.15, 0.2);
    playTone(783.99, 'sine', 0.3, 0.4);
  } catch (error) {
    console.warn('[Sound Notification Warning]:', error.message);
  }
};
