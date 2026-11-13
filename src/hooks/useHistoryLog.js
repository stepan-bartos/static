import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage.js';
import { slimStation } from '../services/stationPicker.js';

const MAX_TRACKS = 60;
const MAX_STATIONS = 20;

/** What you've heard: track titles as they played, and the stations you landed on. */
export function useHistoryLog() {
  const [tracks, setTracks] = useLocalStorage('static:tracks', []);
  const [stations, setStations] = useLocalStorage('static:stations', []);

  const logTrack = useCallback((title, station) => {
    if (!title || !station) return;
    setTracks((prev) => {
      const latest = prev[0];
      if (latest && latest.title === title && latest.stationuuid === station.stationuuid) return prev;
      const entry = { title, station: station.name, stationuuid: station.stationuuid, at: Date.now() };
      return [entry, ...prev].slice(0, MAX_TRACKS);
    });
  }, [setTracks]);

  const logStation = useCallback((station, genreKey) => {
    if (!station) return;
    setStations((prev) => {
      const entry = { ...slimStation(station), genreKey: genreKey ?? null, at: Date.now() };
      return [entry, ...prev.filter((s) => s.stationuuid !== station.stationuuid)].slice(0, MAX_STATIONS);
    });
  }, [setStations]);

  const clear = useCallback(() => {
    setTracks([]);
    setStations([]);
  }, [setTracks, setStations]);

  return { tracks, stations, logTrack, logStation, clear };
}
