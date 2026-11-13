import { useRef } from 'react';
import Icon from './Icon.jsx';
import { useScrollStrip } from '../hooks/useScrollStrip.js';

/** Saved stations as a quiet line of names. Star a station to add it; un-star it to remove it. */
export default function Favorites({ favorites, currentId, onPlay }) {
  const listRef = useRef(null);
  const wasDragged = useScrollStrip(listRef, favorites.length);

  return (
    <nav className="favs" aria-label="Favorites">
      <span className="favs-icon"><Icon name="star" /></span>
      <div className="favs-list" ref={listRef}>
        {favorites.length === 0 && (
          <span className="favs-empty">Star a station to keep it here</span>
        )}
        {favorites.map((station, i) => (
          <span key={station.stationuuid} style={{ display: 'contents' }}>
            {i > 0 && <span className="fav-sep" aria-hidden="true">·</span>}
            <button
              className="fav"
              aria-current={station.stationuuid === currentId}
              title={station.name}
              onClick={() => {
                if (!wasDragged()) onPlay(station);
              }}
            >
              {station.name}
            </button>
          </span>
        ))}
      </div>
    </nav>
  );
}
