import { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import './FindSongButton.css';

const SERVICES = {
  spotify: {
    label: 'Spotify',
    searchUrl: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}`,
  },
  apple: {
    label: 'Apple Music',
    searchUrl: (q) => `https://music.apple.com/search?term=${encodeURIComponent(q)}`,
  },
  youtube: {
    label: 'YouTube Music',
    searchUrl: (q) => `https://music.youtube.com/search?q=${encodeURIComponent(q)}`,
  },
};

export default function FindSongButton({ title }) {
  const [service, setService] = useLocalStorage('static:music-service', null);
  const [showPicker, setShowPicker] = useState(false);

  if (!title) return null;

  const handleFind = () => {
    if (!service) {
      setShowPicker(true);
      return;
    }
    window.open(SERVICES[service].searchUrl(title), '_blank', 'noopener');
  };

  const handlePick = (key) => {
    setService(key);
    setShowPicker(false);
    window.open(SERVICES[key].searchUrl(title), '_blank', 'noopener');
  };

  return (
    <span className="find-song">
      <button
        className="find-song-btn"
        onClick={handleFind}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowPicker(true);
        }}
        title={service ? `Find on ${SERVICES[service].label} (right-click to change)` : 'Find this song'}
      >
{'\u266b'} ↗
      </button>
      {showPicker && (
        <span className="find-song-picker">
          {Object.entries(SERVICES).map(([key, s]) => (
            <button key={key} className="find-song-option" onClick={() => handlePick(key)}>
              {s.label}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
