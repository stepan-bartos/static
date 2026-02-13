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

function openLink(url) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.click();
}

export default function FindSongButton({ title }) {
  const [service, setService] = useLocalStorage('static:music-service', null);
  const [showPicker, setShowPicker] = useState(false);

  if (!title) return null;

  const handleFind = () => {
    if (!service) {
      setShowPicker(true);
      return;
    }
    openLink(SERVICES[service].searchUrl(title));
  };

  const handlePick = (key) => {
    setService(key);
    setShowPicker(false);
    openLink(SERVICES[key].searchUrl(title));
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
