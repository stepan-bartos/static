import { useState, useCallback } from 'react';

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) return JSON.parse(item);
    } catch {
      // fall through
    }
    return typeof initialValue === 'function' ? initialValue() : initialValue;
  });

  const setValue = useCallback((value) => {
    setStoredValue((prev) => {
      const nextValue = typeof value === 'function' ? value(prev) : value;
      try {
        window.localStorage.setItem(key, JSON.stringify(nextValue));
      } catch {
        // localStorage full or unavailable
      }
      return nextValue;
    });
  }, [key]);

  return [storedValue, setValue];
}
