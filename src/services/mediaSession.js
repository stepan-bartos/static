/**
 * Thin wrapper around the Media Session API (OS / lock-screen controls).
 * All calls are feature-detected and no-op where unsupported.
 */
const supported =
  typeof navigator !== 'undefined' && 'mediaSession' in navigator;

export function setMetadata({ title, artist, artwork } = {}) {
  if (!supported || typeof window.MediaMetadata === 'undefined') return;
  navigator.mediaSession.metadata = new window.MediaMetadata({
    title: title || 'Static',
    artist: artist || '',
    album: 'Static Radio',
    artwork: artwork ? [{ src: artwork, sizes: '512x512', type: 'image/png' }] : [],
  });
}

export function setPlaybackState(playbackState) {
  if (!supported) return;
  // 'playing' | 'paused' | 'none'
  navigator.mediaSession.playbackState = playbackState;
}

export function setActionHandlers(handlers = {}) {
  if (!supported) return;
  const safe = (action, fn) => {
    try {
      navigator.mediaSession.setActionHandler(action, fn || null);
    } catch {
      // action unsupported in this browser — ignore
    }
  };
  safe('play', handlers.play);
  safe('pause', handlers.pause);
  safe('nexttrack', handlers.nexttrack);
  safe('previoustrack', handlers.previoustrack);
}
