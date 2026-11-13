/**
 * One <audio> element for the whole app, wrapped so the UI only ever sees a
 * small set of states:
 *
 *   idle → loading → playing ⇄ paused
 *                  ↘ blocked   (autoplay refused — needs a tap)
 *                  ↘ error     (never connected, dropped, or stalled)
 *
 * Live streams misbehave in ways files don't, so "is it really playing?" is
 * decided by whether playback time keeps advancing, not by media events alone.
 */

const CONNECT_TIMEOUT = 12_000; // give a station this long to start
const STALL_TIMEOUT = 12_000; // …and this long of silence before calling it dropped
const WATCHDOG_INTERVAL = 2_000;

class AudioPlayer {
  constructor() {
    this.audio = new Audio();
    this.audio.setAttribute('playsinline', '');
    this.audio.preload = 'none';
    this.onStateChange = null;
    this.state = 'idle';
    this._url = null;
    this._wantPlaying = false;
    this._playId = 0;
    this._lastTime = 0;
    this._lastProgressAt = 0;
    this._watchdog = null;
    this._volume = 1;
    this._fade = null;
    this._setupListeners();
  }

  _set(state) {
    if (this.state === state) return;
    this.state = state;
    this.onStateChange?.(state);
  }

  _setupListeners() {
    const { audio } = this;
    audio.addEventListener('playing', () => {
      if (!this._wantPlaying) return;
      this._lastProgressAt = Date.now();
      this._set('playing');
    });
    audio.addEventListener('waiting', () => {
      if (this._wantPlaying) this._set('loading');
    });
    audio.addEventListener('timeupdate', () => {
      if (audio.currentTime === this._lastTime) return;
      this._lastTime = audio.currentTime;
      this._lastProgressAt = Date.now();
      // Some browsers fire `waiting`/`stalled` and then carry on without a new `playing`
      if (this._wantPlaying && !audio.paused && this.state === 'loading') this._set('playing');
    });
    audio.addEventListener('error', () => {
      if (this._wantPlaying) this._fail();
    });
    // A live stream "ending" means the server dropped us
    audio.addEventListener('ended', () => {
      if (this._wantPlaying) this._fail();
    });
  }

  _startWatchdog() {
    clearInterval(this._watchdog);
    this._watchdog = setInterval(() => {
      if (!this._wantPlaying) return;
      // Paused from outside the app (headphones unplugged, another app took audio focus)
      if (this.state === 'playing' && this.audio.paused) {
        this._wantPlaying = false;
        this._stopWatchdog();
        this._set('paused');
        return;
      }
      const limit = this.state === 'playing' ? STALL_TIMEOUT : CONNECT_TIMEOUT;
      if (Date.now() - this._lastProgressAt > limit) this._fail();
    }, WATCHDOG_INTERVAL);
  }

  _stopWatchdog() {
    clearInterval(this._watchdog);
    this._watchdog = null;
  }

  _fail() {
    this._wantPlaying = false;
    this._stopWatchdog();
    this._set('error');
  }

  /** Start (or restart) a stream. State changes arrive through onStateChange. */
  play(url) {
    const id = ++this._playId;
    this.cancelFade();
    this._url = url;
    this._wantPlaying = true;
    this._lastTime = 0;
    this._lastProgressAt = Date.now();
    this._set('loading');
    this.audio.src = url;
    this.audio.load();
    this._startWatchdog();

    const attempt = this.audio.play();
    if (!attempt || typeof attempt.catch !== 'function') return;
    attempt.catch((err) => {
      // A newer play() or a pause() interrupted this one — not a failure
      if (id !== this._playId || err?.name === 'AbortError') return;
      this._wantPlaying = false;
      this._stopWatchdog();
      this._set(err?.name === 'NotAllowedError' ? 'blocked' : 'error');
    });
  }

  pause() {
    this._playId += 1;
    this._wantPlaying = false;
    this._stopWatchdog();
    this.cancelFade();
    this.audio.pause();
    this._set('paused');
  }

  /** Live radio has no "where I left off": resuming reconnects at the live edge. */
  resume() {
    if (this._url) this.play(this._url);
  }

  setVolume(level) {
    this._volume = Math.max(0, Math.min(1, level));
    if (!this._fade) this.audio.volume = this._volume;
  }

  /** iOS ignores audio.volume entirely — detect that so the UI can hide the slider. */
  canSetVolume() {
    try {
      const probe = new Audio();
      probe.volume = 0.5;
      return probe.volume === 0.5;
    } catch {
      return false;
    }
  }

  /** Fade to silence over `ms`, then pause. Resolves true if it ran to the end. */
  fadeOutAndPause(ms) {
    this.cancelFade();
    if (this.state !== 'playing') {
      this.pause();
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const from = this.audio.volume;
      const startedAt = Date.now();
      const timer = setInterval(() => {
        const t = Math.min(1, (Date.now() - startedAt) / ms);
        this.audio.volume = from * (1 - t);
        if (t >= 1) {
          clearInterval(timer);
          this._fade = null;
          this.pause();
          this.audio.volume = this._volume;
          resolve(true);
        }
      }, 200);
      this._fade = { timer, resolve };
    });
  }

  cancelFade() {
    if (!this._fade) return;
    clearInterval(this._fade.timer);
    this._fade.resolve(false);
    this._fade = null;
    this.audio.volume = this._volume;
  }
}

export default new AudioPlayer();
