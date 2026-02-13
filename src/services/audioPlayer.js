class AudioPlayer {
  constructor() {
    this.audio = new Audio();
    this.audio.setAttribute('playsinline', '');
    this.audio.preload = 'none';
    this.onStateChange = null;
    this._currentUrl = null;
    this._stallTimer = null;
    this._setupListeners();
  }

  _setupListeners() {
    this.audio.addEventListener('playing', () => {
      clearTimeout(this._stallTimer);
      this.onStateChange?.('playing');
    });
    this.audio.addEventListener('waiting', () => {
      this.onStateChange?.('loading');
    });
    this.audio.addEventListener('error', () => {
      clearTimeout(this._stallTimer);
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
    clearTimeout(this._stallTimer);
    this.onStateChange?.('loading');
    this.audio.src = url;
    this.audio.load();

    // If still not playing after 12s, treat as connection failure
    this._stallTimer = setTimeout(() => {
      if (this.audio.paused || this.audio.readyState < 3) {
        this.onStateChange?.('error');
      }
    }, 12000);

    return this.audio.play().then(() => {
      clearTimeout(this._stallTimer);
    }).catch((err) => {
      clearTimeout(this._stallTimer);
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
    clearTimeout(this._stallTimer);
    this.audio.pause();
    this.audio.src = '';
    this.audio.load();
  }

  setVolume(level) {
    this.audio.volume = level;
  }
}

export default new AudioPlayer();
