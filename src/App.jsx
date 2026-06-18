import { useReducer, useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import CRTOverlay from './components/CRTOverlay.jsx';
import Visualizer from './components/Visualizer.jsx';
import StationDisplay from './components/StationDisplay.jsx';
import GenreSelector from './components/GenreSelector.jsx';
import ScanButton from './components/ScanButton.jsx';
import BackButton from './components/BackButton.jsx';
import VolumeControl from './components/VolumeControl.jsx';
import SleepTimer from './components/SleepTimer.jsx';
import ShortcutHelp from './components/ShortcutHelp.jsx';
import FavoritesBar from './components/FavoritesBar.jsx';
import { getRandomStation, searchStationByUuid } from './services/radioApi.js';
import audioPlayer from './services/audioPlayer.js';
import audioVisualizer from './services/audioVisualizer.js';
import metadataService from './services/metadataService.js';
import { setMetadata, setPlaybackState, setActionHandlers } from './services/mediaSession.js';
import { buildShareUrl, parseShareParams, clearShareParams } from './services/shareLink.js';
import { GENRES } from './data/genres.js';
import { useFavorites } from './hooks/useFavorites.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';

const MAX_AUTO_SKIPS = 5;

const initialState = {
  selectedGenre: null,
  currentStation: null,
  isScanning: false,
  scanError: null,
  audioState: 'idle',
  nowPlaying: null,
  trackHistory: [],
  stationHistory: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'SCAN_START':
      return {
        ...state,
        isScanning: true,
        scanError: null,
        nowPlaying: null,
        trackHistory: [],
      };
    case 'SCAN_SUCCESS':
      return {
        ...state,
        isScanning: false,
        currentStation: action.station,
        selectedGenre: action.genre,
      };
    case 'SCAN_ERROR':
      return { ...state, isScanning: false, scanError: action.error };
    case 'SET_AUDIO_STATE':
      return { ...state, audioState: action.audioState };
    case 'PLAY_STATION':
      return {
        ...state,
        currentStation: action.station,
        selectedGenre: action.genre,
        audioState: 'loading',
        nowPlaying: null,
        trackHistory: [],
      };
    case 'RESTORE_SESSION':
      return {
        ...state,
        currentStation: action.station,
        selectedGenre: action.genre,
        audioState: 'idle',
        nowPlaying: null,
        trackHistory: [],
      };
    case 'SET_NOW_PLAYING':
      return { ...state, nowPlaying: action.title };
    case 'PUSH_HISTORY':
      return {
        ...state,
        trackHistory: [action.previousTitle, ...state.trackHistory.slice(0, 4)],
      };
    case 'PUSH_STATION_HISTORY': {
      const entry = { station: action.station, genre: action.genre };
      const filtered = state.stationHistory.filter(
        (e) => e.station.stationuuid !== action.station.stationuuid
      );
      return { ...state, stationHistory: [entry, ...filtered].slice(0, 10) };
    }
    case 'POP_STATION_HISTORY':
      return { ...state, stationHistory: state.stationHistory.slice(1) };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const favorites = useFavorites();
  const [savedSession, setSavedSession] = useLocalStorage('static:session', null);
  const [volume, setVolume] = useLocalStorage('static:volume', 1);
  const [shareCopied, setShareCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [sleepDeadline, setSleepDeadline] = useState(null);
  const [sleepRemaining, setSleepRemaining] = useState(0);

  const audioContextInit = useRef(false);
  const gestureCleanup = useRef(null); // clears autoplay-resume listeners
  const currentStationRef = useRef(null);
  const selectedGenreRef = useRef(null);
  const autoSkipCount = useRef(0);
  const userPausedRef = useRef(false); // true when the user (or sleep timer) stopped playback
  const preMuteVolume = useRef(1);
  const sleepTimeout = useRef(null);
  const sleepInterval = useRef(null);
  const handlersRef = useRef({}); // latest handlers for window/media listeners

  // Keep viewport size in sync (fixes Safari not recalculating on resize / monitor drag)
  useEffect(() => {
    const syncViewport = () => {
      const root = document.documentElement;
      root.style.setProperty('--app-height', `${window.innerHeight}px`);
      root.style.setProperty('--app-width', `${window.innerWidth}px`);
    };
    syncViewport();
    window.addEventListener('resize', syncViewport);
    // visualViewport fires on Safari pinch/zoom and monitor DPI changes
    window.visualViewport?.addEventListener('resize', syncViewport);
    return () => {
      window.removeEventListener('resize', syncViewport);
      window.visualViewport?.removeEventListener('resize', syncViewport);
    };
  }, []);

  const initAudioContext = useCallback(() => {
    if (audioContextInit.current) return;
    audioContextInit.current = true;
    audioVisualizer.connect(audioPlayer.getAudioElement());
  }, []);

  // Attach autoplay-resume listeners — resume playback on first user gesture
  const attachGestureResume = useCallback((url) => {
    const cleanup = () => {
      document.removeEventListener('click', resume);
      document.removeEventListener('touchstart', resume);
      document.removeEventListener('keydown', resume);
      gestureCleanup.current = null;
    };
    const resume = () => {
      cleanup();
      initAudioContext();
      audioPlayer.play(url).catch(() => {});
    };
    gestureCleanup.current = cleanup;
    document.addEventListener('click', resume);
    document.addEventListener('touchstart', resume);
    document.addEventListener('keydown', resume);
  }, [initAudioContext]);

  const handleScan = useCallback(async (genre, isAutoSkip = false) => {
    gestureCleanup.current?.(); // clear autoplay-resume listeners
    if (!isAutoSkip) {
      userPausedRef.current = false;
      autoSkipCount.current = 0;
    }
    const leaving = currentStationRef.current;
    if (leaving) {
      dispatch({ type: 'PUSH_STATION_HISTORY', station: leaving, genre: selectedGenreRef.current });
    }
    dispatch({ type: 'SCAN_START' });
    try {
      const station = await getRandomStation(genre, currentStationRef.current?.stationuuid);
      dispatch({ type: 'SCAN_SUCCESS', station, genre });
      const url = station.url_resolved || station.url;
      audioPlayer.play(url).then(() => {
        initAudioContext(); // After playback starts — avoids iOS audio session conflicts
      }).catch(() => {});
    } catch (err) {
      dispatch({ type: 'SCAN_ERROR', error: err.message });
    }
  }, [initAudioContext]);

  const handleTogglePause = useCallback(() => {
    if (state.audioState === 'playing') {
      userPausedRef.current = true;
      audioPlayer.pause();
    } else if (state.audioState === 'paused') {
      userPausedRef.current = false;
      audioPlayer.resume();
    }
  }, [state.audioState]);

  const handlePlayFavorite = useCallback((station, genre) => {
    gestureCleanup.current?.(); // clear autoplay-resume listeners
    userPausedRef.current = false;
    autoSkipCount.current = 0;
    const leaving = currentStationRef.current;
    if (leaving) {
      dispatch({ type: 'PUSH_STATION_HISTORY', station: leaving, genre: selectedGenreRef.current });
    }
    dispatch({ type: 'PLAY_STATION', station, genre });
    const url = station.url_resolved || station.url;
    audioPlayer.play(url).then(() => {
      initAudioContext();
    }).catch(() => {});
  }, [initAudioContext]);

  const handleBack = useCallback(() => {
    const prev = state.stationHistory[0];
    if (!prev) return;
    gestureCleanup.current?.();
    userPausedRef.current = false;
    autoSkipCount.current = 0;
    dispatch({ type: 'POP_STATION_HISTORY' });
    dispatch({ type: 'PLAY_STATION', station: prev.station, genre: prev.genre });
    const url = prev.station.url_resolved || prev.station.url;
    audioPlayer.play(url).then(() => initAudioContext()).catch(() => {});
  }, [state.stationHistory, initAudioContext]);

  const handleAdjacentGenre = useCallback((direction) => {
    const cur = selectedGenreRef.current;
    const idx = cur ? GENRES.findIndex((g) => g.key === cur.key) : -1;
    const next = GENRES[(idx + direction + GENRES.length) % GENRES.length];
    handleScan(next);
  }, [handleScan]);

  const handleToggleFavorite = useCallback(() => {
    const station = currentStationRef.current;
    if (!station) return;
    if (favorites.isFavorite(station.stationuuid)) {
      favorites.removeFavorite(station.stationuuid);
    } else {
      favorites.addFavorite(station, selectedGenreRef.current);
    }
  }, [favorites]);

  const handleVolumeChange = useCallback((level) => {
    audioPlayer.setVolume(level);
    if (level > 0) preMuteVolume.current = level;
    setVolume(level);
  }, [setVolume]);

  const handleToggleMute = useCallback(() => {
    setVolume((prev) => {
      if (prev > 0) {
        preMuteVolume.current = prev;
        audioPlayer.setVolume(0);
        return 0;
      }
      const restore = preMuteVolume.current || 1;
      audioPlayer.setVolume(restore);
      return restore;
    });
  }, [setVolume]);

  const handleVolumeStep = useCallback((delta) => {
    setVolume((prev) => {
      const next = Math.max(0, Math.min(1, +(prev + delta).toFixed(2)));
      audioPlayer.setVolume(next);
      if (next > 0) preMuteVolume.current = next;
      return next;
    });
  }, [setVolume]);

  const clearSleepTimers = useCallback(() => {
    clearTimeout(sleepTimeout.current);
    clearInterval(sleepInterval.current);
    sleepTimeout.current = null;
    sleepInterval.current = null;
  }, []);

  const handleSetSleep = useCallback((minutes) => {
    clearSleepTimers();
    const ms = minutes * 60000;
    const deadline = Date.now() + ms;
    setSleepDeadline(deadline);
    setSleepRemaining(minutes * 60);
    sleepTimeout.current = setTimeout(() => {
      audioPlayer.pause();
      userPausedRef.current = true; // don't let auto-skip treat the sleep-stop as a failure
      setSleepDeadline(null);
      setSleepRemaining(0);
      clearSleepTimers();
    }, ms);
    sleepInterval.current = setInterval(() => {
      setSleepRemaining(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    }, 1000);
  }, [clearSleepTimers]);

  const handleCancelSleep = useCallback(() => {
    clearSleepTimers();
    setSleepDeadline(null);
    setSleepRemaining(0);
  }, [clearSleepTimers]);

  const handleShare = useCallback(async () => {
    const station = currentStationRef.current;
    if (!station) return;
    const url = buildShareUrl(station, selectedGenreRef.current);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Static', text: `Listening to ${station.name} on Static`, url });
      } catch {
        // user cancelled — ignore
      }
    } else if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch {
        window.prompt('Copy this link:', url);
      }
    } else {
      window.prompt('Copy this link:', url);
    }
  }, []);

  // Restore last session, used when there's no deep-link to honor
  const runRestore = useCallback(() => {
    if (!savedSession?.station || !savedSession?.genre) return;
    const station = savedSession.station;
    const genre = savedSession.genre;
    const url = station.url_resolved || station.url;
    dispatch({ type: 'RESTORE_SESSION', station, genre });
    audioPlayer.play(url).catch((err) => {
      if (err.name === 'NotAllowedError') attachGestureResume(url);
    });
  }, [savedSession, attachGestureResume]);

  // Mount: a shared deep-link (?g=&s=) wins over session restore
  useEffect(() => {
    const share = parseShareParams();
    if (share) {
      (async () => {
        try {
          const station = await searchStationByUuid(share.stationuuid);
          if (!station) {
            runRestore();
            return;
          }
          const genre = GENRES.find((g) => g.key === share.genreKey) || null;
          dispatch({ type: 'PLAY_STATION', station, genre });
          const url = station.url_resolved || station.url;
          audioPlayer.play(url).then(() => initAudioContext()).catch((err) => {
            if (err.name === 'NotAllowedError') attachGestureResume(url);
          });
        } catch {
          runRestore();
        } finally {
          clearShareParams();
        }
      })();
    } else {
      runRestore();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep refs in sync so listeners/callbacks never read stale state
  useEffect(() => {
    currentStationRef.current = state.currentStation;
    selectedGenreRef.current = state.selectedGenre;
  }, [state.currentStation, state.selectedGenre]);

  // Save session when station changes
  useEffect(() => {
    if (state.currentStation && state.selectedGenre) {
      setSavedSession({
        station: state.currentStation,
        genre: state.selectedGenre,
      });
    }
  }, [state.currentStation, state.selectedGenre, setSavedSession]);

  // Wire audio state callbacks — including auto-skip of dead stations
  useEffect(() => {
    audioPlayer.onStateChange = (audioState) => {
      dispatch({ type: 'SET_AUDIO_STATE', audioState });
      if (audioState === 'playing') {
        autoSkipCount.current = 0;
      } else if (audioState === 'error') {
        if (userPausedRef.current) return;
        const genre = selectedGenreRef.current;
        if (!genre) return;
        if (autoSkipCount.current >= MAX_AUTO_SKIPS) return; // give up — show "Signal Lost"
        autoSkipCount.current += 1;
        handlersRef.current.scan?.(genre, true);
      }
    };
    return () => {
      audioPlayer.onStateChange = null;
    };
  }, []);

  // Apply persisted volume once on mount
  useEffect(() => {
    audioPlayer.setVolume(volume);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up sleep timers on unmount
  useEffect(() => clearSleepTimers, [clearSleepTimers]);

  // Poll for now-playing metadata when audio is playing
  useEffect(() => {
    if (state.audioState === 'playing' && state.currentStation) {
      const streamUrl = state.currentStation.url_resolved || state.currentStation.url;
      metadataService.startPolling(streamUrl, ({ title, previousTitle }) => {
        dispatch({ type: 'SET_NOW_PLAYING', title });
        if (previousTitle) {
          dispatch({ type: 'PUSH_HISTORY', previousTitle });
        }
      });
    } else {
      metadataService.stopPolling();
    }
    return () => metadataService.stopPolling();
  }, [state.audioState, state.currentStation]);

  // Media Session: OS / lock-screen controls (attach handlers once)
  useEffect(() => {
    setActionHandlers({
      play: () => audioPlayer.resume(),
      pause: () => audioPlayer.pause(),
      nexttrack: () => {
        const g = selectedGenreRef.current;
        if (g) handlersRef.current.scan?.(g);
      },
      previoustrack: () => handlersRef.current.back?.(),
    });
  }, []);

  // Media Session: metadata follows station + now-playing track
  useEffect(() => {
    if (!state.currentStation) return;
    setMetadata({
      title: state.nowPlaying || state.currentStation.name,
      artist: state.currentStation.name,
      artwork: state.currentStation.favicon,
    });
  }, [state.currentStation, state.nowPlaying]);

  // Media Session: playback state
  useEffect(() => {
    setPlaybackState(
      state.audioState === 'playing'
        ? 'playing'
        : state.audioState === 'paused'
        ? 'paused'
        : 'none'
    );
  }, [state.audioState]);

  // Keyboard shortcuts (attach once; reads everything via refs)
  useEffect(() => {
    const onKeyDown = (e) => {
      const t = e.target;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // allow key-repeat only for volume (arrows up/down)
      if (e.repeat && e.code !== 'ArrowUp' && e.code !== 'ArrowDown') return;

      const h = handlersRef.current;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          h.togglePause?.();
          return;
        case 'ArrowLeft':
          e.preventDefault();
          h.adjacentGenre?.(-1);
          return;
        case 'ArrowRight':
          e.preventDefault();
          h.adjacentGenre?.(1);
          return;
        case 'ArrowUp':
          e.preventDefault();
          h.volumeStep?.(0.1);
          return;
        case 'ArrowDown':
          e.preventDefault();
          h.volumeStep?.(-0.1);
          return;
        default:
          break;
      }
      switch (e.key.toLowerCase()) {
        case 's': {
          const g = selectedGenreRef.current;
          if (g) h.scan?.(g);
          break;
        }
        case 'f':
          h.toggleFavorite?.();
          break;
        case 'b':
          h.back?.();
          break;
        case 'm':
          h.toggleMute?.();
          break;
        case '?':
          h.toggleHelp?.();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Expose the latest handlers to window/media listeners (no stale closures)
  handlersRef.current.togglePause = handleTogglePause;
  handlersRef.current.scan = handleScan;
  handlersRef.current.back = handleBack;
  handlersRef.current.adjacentGenre = handleAdjacentGenre;
  handlersRef.current.toggleFavorite = handleToggleFavorite;
  handlersRef.current.toggleMute = handleToggleMute;
  handlersRef.current.volumeStep = handleVolumeStep;
  handlersRef.current.toggleHelp = () => setShowHelp((prev) => !prev);

  return (
    <div className="app">
      <CRTOverlay />

      <header className="app-header">
        <a href="https://13am.app" className="app-logo">13AM</a>
        <div className="app-title">Static</div>
      </header>

      <Visualizer
        audioState={state.audioState}
        isScanning={state.isScanning}
      />

      <StationDisplay
        station={state.currentStation}
        genre={state.selectedGenre}
        audioState={state.audioState}
        isScanning={state.isScanning}
        scanError={state.scanError}
        favorites={favorites}
        nowPlaying={state.nowPlaying}
        trackHistory={state.trackHistory}
        onTogglePause={handleTogglePause}
        onShare={handleShare}
        shareCopied={shareCopied}
      />

      <div className="controls-area">
        <GenreSelector
          selectedGenre={state.selectedGenre}
          onSelect={handleScan}
          isScanning={state.isScanning}
        />
        <div className="controls-row">
          <BackButton
            onBack={handleBack}
            disabled={state.stationHistory.length === 0 || state.isScanning}
          />
          <ScanButton
            isScanning={state.isScanning}
            onScan={() => state.selectedGenre && handleScan(state.selectedGenre)}
            disabled={!state.selectedGenre}
          />
        </div>
        <div className="controls-row controls-row--secondary">
          <VolumeControl
            volume={volume}
            muted={volume === 0}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
          />
          <SleepTimer
            active={sleepDeadline != null}
            remaining={sleepRemaining}
            onSet={handleSetSleep}
            onCancel={handleCancelSleep}
          />
        </div>
      </div>

      <FavoritesBar
        favorites={favorites.favorites}
        onPlay={handlePlayFavorite}
        onRemove={favorites.removeFavorite}
        currentStationId={state.currentStation?.stationuuid}
      />

      <ShortcutHelp open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
