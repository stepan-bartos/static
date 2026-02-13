import { useLocalStorage } from './useLocalStorage.js';
import { useCallback } from 'react';

const MAX_FAVORITES = 5;

export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage('static:favorites', []);

  const addFavorite = useCallback((station, genre) => {
    setFavorites((prev) => {
      if (prev.length >= MAX_FAVORITES) return prev;
      if (prev.some((f) => f.stationuuid === station.stationuuid)) return prev;
      return [...prev, { ...station, genreKey: genre.key, genreLabel: genre.label }];
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
