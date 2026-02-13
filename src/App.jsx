import { useReducer, useCallback, useEffect, useRef } from 'react';
import './App.css';
import CRTOverlay from './components/CRTOverlay.jsx';
import Visualizer from './components/Visualizer.jsx';
import StationDisplay from './components/StationDisplay.jsx';
import GenreSelector from './components/GenreSelector.jsx';
import ScanButton from './components/ScanButton.jsx';
import FavoritesBar from './components/FavoritesBar.jsx';
import { getRandomStation } from './services/radioApi.js';
import audioPlayer from './services/audioPlayer.js';
import audioVisualizer from './services/audioVisualizer.js';
import metadataService from './services/metadataService.js';
import { useFavorites } from './hooks/useFavorites.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';

const initialState = {
  selectedGenre: null,
  currentStation: null,
  isScanning: false,
  scanError: null,
  audioState: 'idle',
  nowPlaying: null,
  trackHistory: [],
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
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const favorites = useFavorites();
  const [savedSession, setSavedSession] = useLocalStorage('static:session', null);
  const audioContextInit = useRef(false);

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

  // Restore session on mount — attempt autoplay, fall back to first user gesture
  useEffect(() => {
    if (!savedSession?.station || !savedSession?.genre) return;

    const station = savedSession.station;
    const genre = savedSession.genre;
    const url = station.url_resolved || station.url;

    dispatch({ type: 'RESTORE_SESSION', station, genre });

    audioPlayer.play(url).catch((err) => {
      if (err.name === 'NotAllowedError') {
        // Autoplay blocked — resume on first user interaction
        const resume = () => {
          initAudioContext();
          audioPlayer.play(url).catch(() => {});
          cleanup();
        };
        const cleanup = () => {
          document.removeEventListener('click', resume);
          document.removeEventListener('touchstart', resume);
          document.removeEventListener('keydown', resume);
        };
        document.addEventListener('click', resume, { once: true });
        document.addEventListener('touchstart', resume, { once: true });
        document.addEventListener('keydown', resume, { once: true });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save session when station changes
  useEffect(() => {
    if (state.currentStation && state.selectedGenre) {
      setSavedSession({
        station: state.currentStation,
        genre: state.selectedGenre,
      });
    }
  }, [state.currentStation, state.selectedGenre, setSavedSession]);

  // Wire audio state callbacks
  useEffect(() => {
    audioPlayer.onStateChange = (audioState) => {
      dispatch({ type: 'SET_AUDIO_STATE', audioState });
    };
    return () => {
      audioPlayer.onStateChange = null;
    };
  }, []);

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

  const initAudioContext = useCallback(() => {
    if (audioContextInit.current) return;
    audioContextInit.current = true;
    audioVisualizer.connect(audioPlayer.getAudioElement());
  }, []);

  const handleScan = useCallback(async (genre) => {
    dispatch({ type: 'SCAN_START' });
    try {
      const station = await getRandomStation(genre);
      dispatch({ type: 'SCAN_SUCCESS', station, genre });
      const url = station.url_resolved || station.url;
      audioPlayer.play(url).then(() => {
        initAudioContext(); // After playback starts — avoids iOS audio session conflicts
      }).catch(() => {});
    } catch (err) {
      dispatch({ type: 'SCAN_ERROR', error: err.message });
    }
  }, [initAudioContext]);

  const handlePlayFavorite = useCallback((station, genre) => {
    dispatch({ type: 'PLAY_STATION', station, genre });
    const url = station.url_resolved || station.url;
    audioPlayer.play(url).then(() => {
      initAudioContext();
    }).catch(() => {});
  }, [initAudioContext]);

  return (
    <div className="app">
      <CRTOverlay />

      <header className="app-header">
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
      />

      <div className="controls-area">
        <GenreSelector
          selectedGenre={state.selectedGenre}
          onSelect={handleScan}
          isScanning={state.isScanning}
        />
        <ScanButton
          isScanning={state.isScanning}
          onScan={() => state.selectedGenre && handleScan(state.selectedGenre)}
          disabled={!state.selectedGenre}
        />
      </div>

      <FavoritesBar
        favorites={favorites.favorites}
        onPlay={handlePlayFavorite}
        onRemove={favorites.removeFavorite}
        currentStationId={state.currentStation?.stationuuid}
      />
    </div>
  );
}
