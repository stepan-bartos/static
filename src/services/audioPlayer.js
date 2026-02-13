class AudioPlayer {
  constructor() {
    this.audio = new Audio();
    this.onStateChange = null;
    this._currentUrl = null;
    this._setupListeners();
  }

  _setupListeners() {
    this.audio.addEventListener('playing', () => {
      this.onStateChange?.('playing');
    });
    this.audio.addEventListener('waiting', () => {
      this.onStateChange?.('loading');
    });
    this.audio.addEventListener('error', () => {
      this.onStateChange?.('error');
    });
    this.audio.addEventListener('stalled', () => {
      this.onStateChange?.('loading');
    });
  }

  getAudioElement() {
    return this.audio;
  }

  play(url) {
    this.audio.pause();
    this._currentUrl = url;
    this.onStateChange?.('loading');
    this.audio.src = url;
    this.audio.load();
    return this.audio.play().catch((err) => {
      // NotAllowedError = autoplay blocked, not a real failure
      if (err.name === 'NotAllowedError') {
        this.onStateChange?.('blocked');
      } else {
        this.onStateChange?.('error');
      }
      throw err;
    });
  }

  stop() {
    this.audio.pause();
    this.audio.src = '';
    this.audio.load();
  }

  setVolume(level) {
    this.audio.volume = level;
  }
}

export default new AudioPlayer();
