import { useRef, useEffect } from 'react';
import { GENRES } from '../data/genres.js';
import './GenreSelector.css';

export default function GenreSelector({ selectedGenre, onSelect, isScanning }) {
  const stripRef = useRef(null);
  const activeRef = useRef(null);

  // Scroll active genre into view
  useEffect(() => {
    if (activeRef.current && stripRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [selectedGenre]);

  return (
    <div className="genre-selector">
      <div className="genre-strip" ref={stripRef}>
        {GENRES.map((genre) => {
          const isActive = selectedGenre?.key === genre.key;
          return (
            <button
              key={genre.key}
              ref={isActive ? activeRef : null}
              className={`genre-pill ${isActive ? 'genre-pill--active' : ''}`}
              onClick={() => onSelect(genre)}
              disabled={isScanning}
            >
              {genre.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
