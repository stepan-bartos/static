import { useEffect, useRef } from 'react';
import { ALL_GENRES } from '../data/genres.js';
import { useScrollStrip } from '../hooks/useScrollStrip.js';

function centreChosen(strip, behavior) {
  const chosen = strip?.querySelector('[aria-pressed="true"]');
  if (!chosen) return;
  strip.scrollTo({
    left: chosen.offsetLeft + chosen.offsetWidth / 2 - strip.clientWidth / 2,
    behavior,
  });
}

/** Every genre on one scrollable line. The chosen one is lit and kept in view. */
export default function GenreLine({ selection, onSelect }) {
  const stripRef = useRef(null);
  const settled = useRef(false);
  const wasDragged = useScrollStrip(stripRef);

  // Bring the chosen genre to the middle — instantly on load, smoothly afterwards
  useEffect(() => {
    centreChosen(stripRef.current, settled.current ? 'smooth' : 'auto');
    settled.current = true;
  }, [selection]);

  // Re-centre when the line changes width (window resize, rotation) and once
  // the web font arrives, since both move the chosen genre around
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return undefined;
    let width = strip.clientWidth;
    const observer = new ResizeObserver(() => {
      if (strip.clientWidth === width) return;
      width = strip.clientWidth;
      centreChosen(strip, 'auto');
    });
    observer.observe(strip);
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) centreChosen(strip, 'auto');
    });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return (
    <div className="genres-wrap">
      <nav className="genres" ref={stripRef} aria-label="Genre to scan in">
        {ALL_GENRES.map((genre) => (
          <button
            key={genre.key}
            className="genre"
            aria-pressed={genre.key === selection}
            onClick={() => {
              if (!wasDragged()) onSelect(genre.key);
            }}
          >
            {genre.label}
          </button>
        ))}
      </nav>
      <div className="genres-pos" aria-hidden="true"><i /></div>
    </div>
  );
}
