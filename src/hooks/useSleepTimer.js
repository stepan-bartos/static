import { useCallback, useEffect, useEffectEvent, useState } from 'react';

export const SLEEP_FADE_MS = 15_000;

/**
 * Counts down to a stop time. `onSleep` is called SLEEP_FADE_MS before the
 * end so playback can fade out instead of cutting off; `onCancel` lets the
 * caller undo a fade that's already under way.
 */
export function useSleepTimer({ onSleep, onCancel }) {
  const [endsAt, setEndsAt] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const fireSleep = useEffectEvent(() => onSleep?.());

  useEffect(() => {
    if (!endsAt) return undefined;
    const fadeTimer = setTimeout(fireSleep, Math.max(0, endsAt - Date.now() - SLEEP_FADE_MS));
    const ticker = setInterval(() => {
      const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) setEndsAt(null);
    }, 1000);
    return () => {
      clearTimeout(fadeTimer);
      clearInterval(ticker);
    };
  }, [endsAt]);

  const start = useCallback((minutes) => {
    setRemaining(minutes * 60);
    setEndsAt(Date.now() + minutes * 60_000);
  }, []);

  const cancel = useCallback(() => {
    setEndsAt(null);
    setRemaining(0);
    onCancel?.();
  }, [onCancel]);

  return { active: endsAt !== null, remaining, start, cancel };
}
