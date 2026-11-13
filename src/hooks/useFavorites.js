import { useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage.js';
import { slimStation } from '../services/stationPicker.js';

export const MAX_FAVORITES = 10;
const COOKIE_KEY = 'static_favorites';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const COOKIE_BUDGET = 3800; // browsers cap a cookie at ~4 KB

/**
 * A cookie copy of the favorites survives Safari's 7-day localStorage
 * eviction. Only the essentials go in, and the list is trimmed to fit.
 */
function writeCookie(favorites) {
  try {
    let items = favorites.map((f) => ({
      stationuuid: f.stationuuid,
      name: f.name,
      url: f.url_resolved || f.url,
      genreKey: f.genreKey,
    }));
    let encoded = encodeURIComponent(JSON.stringify(items));
    while (encoded.length > COOKIE_BUDGET && items.length > 0) {
      items = items.slice(0, -1);
      encoded = encodeURIComponent(JSON.stringify(items));
    }
    document.cookie = `${COOKIE_KEY}=${encoded};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
  } catch {
    // cookie write failed (disabled, etc.)
  }
}

function readCookie() {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
    if (!match) return null;
    const items = JSON.parse(decodeURIComponent(match[1]));
    return Array.isArray(items) ? items : null;
  } catch {
    return null;
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage('static:favorites', () => readCookie() || []);

  useEffect(() => {
    writeCookie(favorites);
  }, [favorites]);

  const addFavorite = useCallback((station, genreKey) => {
    setFavorites((prev) => {
      if (prev.length >= MAX_FAVORITES) return prev;
      if (prev.some((f) => f.stationuuid === station.stationuuid)) return prev;
      return [...prev, { ...slimStation(station), genreKey: genreKey ?? station.genreKey ?? null }];
    });
  }, [setFavorites]);

  const removeFavorite = useCallback((stationuuid) => {
    setFavorites((prev) => prev.filter((f) => f.stationuuid !== stationuuid));
  }, [setFavorites]);

  const isFavorite = useCallback(
    (stationuuid) => favorites.some((f) => f.stationuuid === stationuuid),
    [favorites],
  );

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    isFull: favorites.length >= MAX_FAVORITES,
  };
}
