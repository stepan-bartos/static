import { useEffect, useEffectEvent } from 'react';
import { setActionHandlers, setMetadata, setPlaybackState } from '../services/mediaSession.js';

/** Lock-screen / headphone / keyboard media controls. */
export function useMediaSession({ status, station, nowPlaying, onPlay, onPause, onNext, onPrevious }) {
  const act = useEffectEvent((action) => {
    ({ play: onPlay, pause: onPause, nexttrack: onNext, previoustrack: onPrevious })[action]?.();
  });

  useEffect(() => {
    setActionHandlers({
      play: () => act('play'),
      pause: () => act('pause'),
      nexttrack: () => act('nexttrack'),
      previoustrack: () => act('previoustrack'),
    });
    return () => setActionHandlers({});
  }, []);

  useEffect(() => {
    if (!station) return;
    setMetadata({
      title: nowPlaying || station.name,
      artist: nowPlaying ? station.name : 'Static',
      artwork: station.favicon,
    });
  }, [station, nowPlaying]);

  useEffect(() => {
    setPlaybackState(status === 'playing' ? 'playing' : status === 'paused' ? 'paused' : 'none');
  }, [status]);
}
