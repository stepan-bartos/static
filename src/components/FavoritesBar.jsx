import { GENRES } from '../data/genres.js';
import './FavoritesBar.css';

export default function FavoritesBar({ favorites, onPlay, onRemove, currentStationId }) {
  if (favorites.length === 0) return null;

  const handlePlay = (station) => {
    const genre = GENRES.find((g) => g.key === station.genreKey) || {
      key: station.genreKey,
      label: station.genreLabel || station.genreKey,
      tags: [],
    };
    onPlay(station, genre);
  };

  return (
    <div className="favorites-bar">
      {favorites.map((station, i) => (
        <span key={station.stationuuid} className="fb-item">
          {i > 0 && <span className="fb-dot" aria-hidden="true">&middot;</span>}
          <button
            className={`fb-name ${station.stationuuid === currentStationId ? 'fb-name--active' : ''}`}
            onClick={() => handlePlay(station)}
            title={station.name}
          >
            {station.name}
          </button>
          <button
            className="fb-remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(station.stationuuid);
            }}
            title="Remove"
            aria-label={`Remove ${station.name}`}
          >
            &times;
          </button>
        </span>
      ))}
    </div>
  );
}
