class AudioVisualizer {
  constructor() {
    this.audioContext = null;
  }

  connect(audioElement) {
    if (this.audioContext) {
      // Resume if suspended (mobile browsers start AudioContext in suspended state)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      return;
    }
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.audioContext.resume().catch(() => {});
    } catch {
      // Web Audio not available — visualizer will use simulated modes
    }
  }

  getScanningBandLevels(timestamp) {
    const t = timestamp / 1000;
    const sweep = (Math.sin(t * 3) + 1) / 2;
    return [0, 1, 2, 3, 4].map((i) => {
      const offset = i / 5;
      const wave = Math.max(0, Math.sin((sweep - offset) * Math.PI * 2));
      return 0.1 + wave * 0.5;
    });
  }

  // Warm, alive pulse for when music is playing.
  // Each ring pulses at a slightly different rate for organic feel.
  getPlayingBandLevels(timestamp) {
    const t = timestamp / 1000;
    return [0, 1, 2, 3, 4].map((i) => {
      const rate = 0.8 + i * 0.15;
      const phase = i * 0.7;
      const base = 0.25 + 0.2 * Math.sin(t * rate + phase);
      const flutter = 0.06 * Math.sin(t * (2.3 + i * 0.4) + phase * 2);
      return base + flutter;
    });
  }

  getIdleBandLevels(timestamp) {
    const t = timestamp / 1000;
    const breath = 0.06 + 0.04 * Math.sin(t * 0.5);
    return [breath, breath * 0.9, breath * 0.7, breath * 0.5, breath * 0.3];
  }
}

export default new AudioVisualizer();
