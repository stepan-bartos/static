import { useLocalStorage } from './useLocalStorage.js';
import { useCallback, useEffect } from 'react';

const MAX_FAVORITES = 5;
const COOKIE_KEY = 'static_favorites';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Keep only the fields we need — keeps storage small and cookie-safe. */
function slimStation(station, genre) {
  return {
    stationuuid: station.stationuuid,
    name: station.name,
    url: station.url,
    url_resolved: station.url_resolved,
    favicon: station.favicon || '',
    country: station.country || '',
    countrycode: station.countrycode || '',
    codec: station.codec || '',
    bitrate: station.bitrate || 0,
    genreKey: genre?.key ?? station.genreKey,
    genreLabel: genre?.label ?? station.genreLabel,
  };
}

function writeCookie(favorites) {
  try {
    const json = JSON.stringify(favorites);
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(json)};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
  } catch {
    // cookie write failed (size, disabled, etc.)
  }
}

function readCookie() {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
    if (!match) return null;
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage('static:favorites', () => {
    // If localStorage was empty (Safari eviction), restore from cookie
    return readCookie() || [];
  });

  // Mirror every change to a cookie (survives Safari 7-day localStorage eviction)
  useEffect(() => {
    writeCookie(favorites);
  }, [favorites]);

  const addFavorite = useCallback((station, genre) => {
    setFavorites((prev) => {
      if (prev.length >= MAX_FAVORITES) return prev;
      if (prev.some((f) => f.stationuuid === station.stationuuid)) return prev;
      return [...prev, slimStation(station, genre)];
    });
  }, [setFavorites]);

  const removeFavorite = useCallback((stationuuid) => {
    setFavorites((prev) => prev.filter((f) => f.stationuuid !== stationuuid));
  }, [setFavorites]);

  const isFavorite = useCallback((stationuuid) => {
    return favorites.some((f) => f.stationuuid === stationuuid);
  }, [favorites]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    isFull: favorites.length >= MAX_FAVORITES,
  };
}
