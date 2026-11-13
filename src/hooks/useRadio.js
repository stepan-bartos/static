import { useEffect, useEffectEvent, useReducer, useRef } from 'react';
import audioPlayer from '../services/audioPlayer.js';
import { fetchGenrePool, randomMusicGenre, searchStationByUuid, reportClick, deviceLimits } from '../services/radioApi.js';
import { pickStation, slimStation, streamUrl } from '../services/stationPicker.js';
import { startPolling, stopPolling } from '../services/metadataService.js';
import { parseShareParams, clearShareParams } from '../services/shareLink.js';
import { readJSON, writeJSON } from '../services/storage.js';
import { ALL_GENRES, findGenre } from '../data/genres.js';
import { initialRadioState, radioReducer } from './radioReducer.js';

const SESSION_KEY = 'static:session';
const MAX_RETRIES = 3; // reconnect attempts for a station that was playing
const MAX_SKIPS = 5; // dead stations to scan past before giving up
const RECENT_LIMIT = 30; // stations to avoid repeating

function init() {
  const saved = readJSON(SESSION_KEY);
  const shared = parseShareParams();
  // Sessions saved by older versions stored the whole genre object
  const savedGenreKey = saved?.genreKey ?? saved?.genre?.key ?? null;
  const selection = saved?.selection ?? savedGenreKey ?? 'any';
  return {
    ...initialRadioState,
    selection: findGenre(selection) ? selection : 'any',
    // The last station stays on screen even while a shared link loads, so a
    // dead link leaves you where you were instead of with nothing
    station: saved?.station?.stationuuid ? slimStation(saved.station) : null,
    stationGenreKey: savedGenreKey,
    isScanning: Boolean(shared),
  };
}

function friendlyError(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return "You're offline.";
  if (err?.name === 'AbortError' || err instanceof TypeError) return "Can't reach the station directory. Try again in a moment.";
  return err?.message || 'Something went wrong. Try again.';
}

/**
 * The radio itself: which station is on, how it got there, and what to do
 * when a stream fails. Components only see state and a handful of actions.
 */
export function useRadio({ onTrack, onStationPlaying } = {}) {
  const [state, dispatch] = useReducer(radioReducer, undefined, init);

  const scanToken = useRef(0); // latest scan / load wins
  const userPaused = useRef(false);
  const retries = useRef(0);
  const skips = useRef(0);
  const everPlayed = useRef(false); // has the current station produced sound yet?
  const source = useRef('direct'); // 'scan' stations may be skipped; 'direct' ones are never swapped out
  const recentIds = useRef([]);
  const retryTimer = useRef(null);

  function startStation(station, genreKey, from, history = 'push') {
    clearTimeout(retryTimer.current);
    userPaused.current = false;
    retries.current = 0;
    everPlayed.current = false;
    source.current = from;
    const slim = slimStation(station);
    recentIds.current = [slim.stationuuid, ...recentIds.current.filter((id) => id !== slim.stationuuid)].slice(0, RECENT_LIMIT);
    dispatch({ type: 'STATION', station: slim, genreKey, history });
    audioPlayer.play(streamUrl(slim));
  }

  async function scan(selectionOverride, { auto = false } = {}) {
    const token = ++scanToken.current;
    clearTimeout(retryTimer.current);
    if (!auto) skips.current = 0;
    const selection = selectionOverride ?? state.selection;
    const currentId = state.station?.stationuuid ?? null;
    dispatch({ type: 'SCAN_START' });
    try {
      const genre = selection === 'any' ? randomMusicGenre() : findGenre(selection) ?? randomMusicGenre();
      const pool = await fetchGenrePool(genre);
      if (token !== scanToken.current) return;
      const station = pickStation(pool, { currentId, recentIds: recentIds.current, ...deviceLimits() });
      if (!station) throw new Error(`No stations found for ${genre.label}.`);
      startStation(station, genre.key, 'scan');
    } catch (err) {
      if (token !== scanToken.current) return;
      dispatch({ type: 'SCAN_ERROR', error: friendlyError(err) });
    }
  }

  function selectGenre(key) {
    if (!findGenre(key)) return;
    dispatch({ type: 'SELECT', selection: key });
    scan(key);
  }

  function stepGenre(direction) {
    const index = ALL_GENRES.findIndex((g) => g.key === state.selection);
    const next = ALL_GENRES[(index + direction + ALL_GENRES.length) % ALL_GENRES.length];
    selectGenre(next.key);
  }

  function pause() {
    userPaused.current = true;
    clearTimeout(retryTimer.current);
    audioPlayer.pause();
  }

  function resume() {
    if (!state.station) return;
    userPaused.current = false;
    retries.current = 0;
    clearTimeout(retryTimer.current);
    audioPlayer.play(streamUrl(state.station));
  }

  /** The big button: start the radio, pause it, or bring it back. */
  function toggle() {
    if (state.isScanning) return;
    if (!state.station) {
      scan();
    } else if (state.audioState === 'playing' || state.audioState === 'loading') {
      pause();
    } else {
      resume();
    }
  }

  function playStation(station, genreKey) {
    scanToken.current += 1; // cancel any scan in flight
    if (station.stationuuid === state.station?.stationuuid) {
      if (state.audioState !== 'playing' && state.audioState !== 'loading') resume();
      return;
    }
    startStation(station, genreKey ?? null, 'direct');
  }

  function back() {
    const previous = state.backStack[0];
    if (!previous) return;
    scanToken.current += 1;
    startStation(previous.station, previous.genreKey, 'direct', 'pop');
  }

  /** Fade out and stop — used by the sleep timer. */
  async function sleep(fadeMs) {
    const finished = await audioPlayer.fadeOutAndPause(fadeMs);
    if (finished) userPaused.current = true;
  }

  // ── Audio state, including recovery from dead or dropped streams ──
  const onAudioState = useEffectEvent((audioState) => {
    if (audioState === 'playing') {
      if (!everPlayed.current && state.station) {
        everPlayed.current = true;
        reportClick(state.station.stationuuid);
        onStationPlaying?.(state.station, state.stationGenreKey);
      }
      retries.current = 0;
      skips.current = 0;
    } else if (audioState === 'error' && !userPaused.current && state.station && navigator.onLine !== false) {
      // A station that was playing gets several reconnects; one that never
      // started gets a single retry if you asked for it by name, none if it
      // was a random scan result (there are plenty more of those).
      const allowed = everPlayed.current ? MAX_RETRIES : source.current === 'scan' ? 0 : 1;
      if (retries.current < allowed) {
        retries.current += 1;
        const url = streamUrl(state.station);
        dispatch({ type: 'RECONNECTING' });
        retryTimer.current = setTimeout(() => audioPlayer.play(url), 1200 * retries.current);
        return;
      }
      if (source.current === 'scan' && skips.current < MAX_SKIPS) {
        skips.current += 1;
        scan(undefined, { auto: true });
        return;
      }
    }
    dispatch({ type: 'AUDIO', audioState });
  });

  useEffect(() => {
    audioPlayer.onStateChange = (audioState) => onAudioState(audioState);
    return () => {
      audioPlayer.onStateChange = null;
      clearTimeout(retryTimer.current);
    };
  }, []);

  // ── On load: a shared link wins; otherwise pick up where you left off ──
  const onMount = useEffectEvent(() => {
    const shared = parseShareParams();
    if (!shared) {
      if (state.station) audioPlayer.play(streamUrl(state.station));
      return;
    }
    const token = ++scanToken.current;
    searchStationByUuid(shared.stationuuid)
      .then((station) => {
        if (token !== scanToken.current) return;
        if (!station) throw new Error('That shared station is no longer listed.');
        startStation(station, findGenre(shared.genreKey)?.key ?? null, 'direct');
      })
      .catch((err) => {
        if (token === scanToken.current) dispatch({ type: 'SCAN_ERROR', error: friendlyError(err) });
      })
      .finally(clearShareParams);
  });

  useEffect(() => {
    onMount();
  }, []);

  // ── Remember the station and the chosen genre ──
  useEffect(() => {
    writeJSON(SESSION_KEY, {
      station: state.station,
      genreKey: state.stationGenreKey,
      selection: state.selection,
    });
  }, [state.station, state.stationGenreKey, state.selection]);

  // ── Now-playing titles while the stream is audible ──
  const playingUrl = state.audioState === 'playing' && state.station ? streamUrl(state.station) : null;
  const onTitle = useEffectEvent((title) => {
    const station = state.station;
    if (!station || title.toLowerCase() === station.name.toLowerCase()) return;
    dispatch({ type: 'TRACK', title });
    onTrack?.(title, station);
  });

  useEffect(() => {
    if (!playingUrl) return undefined;
    startPolling(playingUrl, (title) => onTitle(title));
    return stopPolling;
  }, [playingUrl]);

  // ── Back online: pick the stream up again without being asked ──
  const onOnline = useEffectEvent(() => {
    if (state.audioState === 'error' && !userPaused.current && state.station) resume();
  });

  useEffect(() => {
    const listener = () => onOnline();
    window.addEventListener('online', listener);
    return () => window.removeEventListener('online', listener);
  }, []);

  const status = state.isScanning
    ? 'scanning'
    : state.reconnecting
    ? 'reconnecting'
    : state.audioState;

  return {
    status, // idle | scanning | loading | reconnecting | playing | paused | blocked | error
    station: state.station,
    stationGenre: findGenre(state.stationGenreKey),
    selection: state.selection,
    nowPlaying: state.nowPlaying,
    error: state.error,
    canGoBack: state.backStack.length > 0,
    scan: () => scan(),
    selectGenre,
    stepGenre,
    toggle,
    pause,
    resume,
    playStation,
    back,
    sleep,
  };
}
