import { useEffect, useState } from 'react';
import './App.css';
import CRTOverlay from './components/CRTOverlay.jsx';
import NowPlaying from './components/NowPlaying.jsx';
import Dial from './components/Dial.jsx';
import Favorites from './components/Favorites.jsx';
import VolumeControl from './components/VolumeControl.jsx';
import SleepTimer from './components/SleepTimer.jsx';
import GenreLine from './components/GenreLine.jsx';
import LogPanel from './components/LogPanel.jsx';
import ShortcutHelp from './components/ShortcutHelp.jsx';
import audioPlayer from './services/audioPlayer.js';
import { buildShareUrl } from './services/shareLink.js';
import { findSong, MUSIC_SERVICES } from './services/musicServices.js';
import { useRadio } from './hooks/useRadio.js';
import { useFavorites, MAX_FAVORITES } from './hooks/useFavorites.js';
import { useHistoryLog } from './hooks/useHistoryLog.js';
import { useVolume } from './hooks/useVolume.js';
import { useSleepTimer, SLEEP_FADE_MS } from './hooks/useSleepTimer.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { useMediaSession } from './hooks/useMediaSession.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useToast } from './hooks/useToast.js';
import { useOnline } from './hooks/useOnline.js';

export default function App() {
  const favorites = useFavorites();
  const history = useHistoryLog();
  const radio = useRadio({ onTrack: history.logTrack, onStationPlaying: history.logStation });
  const volume = useVolume();
  const sleepTimer = useSleepTimer({
    onSleep: () => radio.sleep(SLEEP_FADE_MS),
    onCancel: () => audioPlayer.cancelFade(),
  });
  const [musicService, setMusicService] = useLocalStorage('static:music-service', null);
  const [logOpen, setLogOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, showToast] = useToast();
  const online = useOnline();

  const { station, stationGenre, status, nowPlaying } = radio;
  const isFavorite = station ? favorites.isFavorite(station.stationuuid) : false;

  // Keep viewport size in sync (Safari doesn't always recalculate on resize / monitor drag)
  useEffect(() => {
    const syncViewport = () => {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };
    syncViewport();
    window.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('resize', syncViewport);
    return () => {
      window.removeEventListener('resize', syncViewport);
      window.visualViewport?.removeEventListener('resize', syncViewport);
    };
  }, []);

  // The tab title follows what's on
  useEffect(() => {
    document.title = station
      ? `${nowPlaying || station.name} · Static`
      : 'Static - A radio, not a recommendation engine';
  }, [station, nowPlaying]);

  const toggleFavorite = () => {
    if (!station) return;
    if (isFavorite) {
      favorites.removeFavorite(station.stationuuid);
      showToast('Removed from favorites');
    } else if (favorites.isFull) {
      showToast(`Favorites are full (${MAX_FAVORITES}). Remove one first.`);
    } else {
      favorites.addFavorite(station, stationGenre?.key);
      showToast('Added to favorites');
    }
  };

  const share = async () => {
    if (!station) return;
    const url = buildShareUrl(station, stationGenre);
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    if (touch && navigator.share) {
      try {
        await navigator.share({ title: 'Static', text: `Listening to ${station.name} on Static`, url });
      } catch {
        // share sheet dismissed
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied');
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  const chooseService = (key, title) => {
    setMusicService(key);
    if (title) findSong(key, title);
    else showToast(`Songs will open in ${MUSIC_SERVICES[key].label}`);
  };

  const startSleep = (minutes) => {
    sleepTimer.start(minutes);
    showToast(`Stopping in ${minutes} minutes`);
  };

  useMediaSession({
    status,
    station,
    nowPlaying,
    onPlay: radio.resume,
    onPause: radio.pause,
    onNext: radio.scan,
    onPrevious: radio.back,
  });

  useKeyboardShortcuts({
    togglePlay: radio.toggle,
    scan: radio.scan,
    back: radio.back,
    toggleFavorite,
    previousGenre: () => radio.stepGenre(-1),
    nextGenre: () => radio.stepGenre(1),
    volumeUp: () => volume.step(0.1),
    volumeDown: () => volume.step(-0.1),
    toggleMute: volume.toggleMute,
    toggleLog: () => setLogOpen((open) => !open),
    toggleHelp: () => setHelpOpen((open) => !open),
    escape: () => {
      setLogOpen(false);
      setHelpOpen(false);
    },
  });

  const announcement =
    status === 'playing' && station
      ? `Now playing ${station.name}`
      : status === 'error'
      ? 'Signal lost'
      : '';

  return (
    <div className="app" data-status={status}>
      <header className="header">
        <a href="https://13am.app" className="logo">13AM</a>
        <div className="title">STATIC</div>
        <div className="header-actions">
          <button
            className="header-btn keys"
            onClick={() => setHelpOpen((open) => !open)}
            aria-expanded={helpOpen}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
          <button
            className="header-btn"
            onClick={() => setLogOpen(true)}
            aria-expanded={logOpen}
            title="Listening log (L)"
          >
            LOG
          </button>
        </div>
      </header>

      <main className="stage">
        <NowPlaying
          status={status}
          offline={!online}
          station={station}
          genre={stationGenre}
          nowPlaying={nowPlaying}
          error={radio.error}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          onShare={share}
          musicService={musicService}
          onFindSong={(title) => findSong(musicService, title)}
          onChooseService={chooseService}
        />
        <Dial
          status={status}
          hasStation={Boolean(station)}
          canGoBack={radio.canGoBack}
          onToggle={radio.toggle}
          onScan={radio.scan}
          onBack={radio.back}
        />
      </main>

      <footer className="dock">
        <div className="dock-top">
          <Favorites
            favorites={favorites.favorites}
            currentId={station?.stationuuid}
            onPlay={(fav) => radio.playStation(fav, fav.genreKey)}
          />
          {volume.supported && (
            <VolumeControl
              volume={volume.volume}
              muted={volume.muted}
              onChange={volume.setVolume}
              onToggleMute={volume.toggleMute}
            />
          )}
          <SleepTimer
            active={sleepTimer.active}
            remaining={sleepTimer.remaining}
            onStart={startSleep}
            onCancel={sleepTimer.cancel}
          />
        </div>
        <GenreLine selection={radio.selection} onSelect={radio.selectGenre} />
      </footer>

      <LogPanel
        open={logOpen}
        onClose={() => setLogOpen(false)}
        tracks={history.tracks}
        stations={history.stations}
        musicService={musicService}
        onChooseService={chooseService}
        onFindSong={(title) => findSong(musicService, title)}
        onPlayStation={(entry) => radio.playStation(entry, entry.genreKey)}
        onClear={history.clear}
      />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

      <div className="toast" data-show={toast.show} role="status" aria-live="polite">{toast.text}</div>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      <CRTOverlay />
    </div>
  );
}
