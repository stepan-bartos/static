/**
 * Thin wrapper around the Media Session API (OS / lock-screen controls).
 * All calls are feature-detected and no-op where unsupported.
 */
const supported = typeof navigator !== 'undefined' && 'mediaSession' in navigator;

export function setMetadata({ title, artist, artwork } = {}) {
  if (!supported || typeof window.MediaMetadata === 'undefined') return;
  navigator.mediaSession.metadata = new window.MediaMetadata({
    title: title || 'Static',
    artist: artist || '',
    album: 'Static',
    artwork: artwork ? [{ src: artwork }] : [],
  });
}

export function setPlaybackState(playbackState) {
  if (!supported) return;
  navigator.mediaSession.playbackState = playbackState; // 'playing' | 'paused' | 'none'
}

export function setActionHandlers(handlers = {}) {
  if (!supported) return;
  for (const action of ['play', 'pause', 'nexttrack', 'previoustrack']) {
    try {
      navigator.mediaSession.setActionHandler(action, handlers[action] || null);
    } catch {
      // action unsupported in this browser — ignore
    }
  }
}
