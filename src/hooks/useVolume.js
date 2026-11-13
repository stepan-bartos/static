import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalStorage } from './useLocalStorage.js';
import audioPlayer from '../services/audioPlayer.js';

const clamp = (v) => Math.max(0, Math.min(1, v));

export function useVolume() {
  const [volume, setStored] = useLocalStorage('static:volume', 1);
  const [supported] = useState(() => audioPlayer.canSetVolume());
  const beforeMute = useRef(1);

  useEffect(() => {
    audioPlayer.setVolume(volume);
    if (volume > 0) beforeMute.current = volume;
  }, [volume]);

  const setVolume = useCallback((level) => setStored(clamp(level)), [setStored]);
  const step = useCallback(
    (delta) => setStored((prev) => clamp(Math.round((prev + delta) * 100) / 100)),
    [setStored],
  );
  const toggleMute = useCallback(
    () => setStored((prev) => (prev > 0 ? 0 : beforeMute.current || 1)),
    [setStored],
  );

  return { volume, muted: volume === 0, supported, setVolume, step, toggleMute };
}
