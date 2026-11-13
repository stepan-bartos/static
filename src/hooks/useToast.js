import { useCallback, useEffect, useRef, useState } from 'react';

/** One short message at a time, shown briefly. */
export function useToast(duration = 2400) {
  const [toast, setToast] = useState({ text: '', show: false });
  const timer = useRef(null);

  const showToast = useCallback((text) => {
    clearTimeout(timer.current);
    setToast({ text, show: true });
    timer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), duration);
  }, [duration]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return [toast, showToast];
}
