import { useRef, useEffect, useState } from 'react';
import FindSongButton from './FindSongButton.jsx';
import './StationDisplay.css';

export default function StationDisplay({
  station,
  genre,
  audioState,
  isScanning,
  scanError,
  favorites,
  nowPlaying,
  trackHistory,
}) {
  const marqueeRef = useRef(null);
  const textRef = useRef(null);
  const [scrollDuration, setScrollDuration] = useState(0);

  // Detect overflow and set scroll animation duration
  useEffect(() => {
    if (!marqueeRef.current || !textRef.current) {
      setScrollDuration(0);
      return;
    }
    const containerW = marqueeRef.current.offsetWidth;
    // Measure just the first copy span
    const firstCopy = textRef.current.querySelector('.sd-name-copy');
    const copyW = firstCopy ? firstCopy.offsetWidth : textRef.current.scrollWidth;
    if (copyW > containerW) {
      // ~50px per second scroll speed, duration = one copy width (including gap)
      setScrollDuration(copyW / 50);
    } else {
      setScrollDuration(0);
    }
  }, [station?.name, nowPlaying]);

  if (!station && !isScanning && !scanError) {
    return (
      <div className="station-display station-display--empty">
        <p>Pick a genre and scan</p>
      </div>
    );
  }

  const statusText = isScanning
    ? 'Scanning...'
    : audioState === 'loading'
    ? 'Connecting...'
    : audioState === 'playing'
    ? 'On Air'
    : audioState === 'error'
    ? 'Signal Lost'
    : audioState === 'blocked'
    ? 'Tap to play'
    : '';

  const isFav = station ? favorites.isFavorite(station.stationuuid) : false;

  const handleFavorite = () => {
    if (!station) return;
    if (isFav) {
      favorites.removeFavorite(station.stationuuid);
    } else {
      favorites.addFavorite(station, genre);
    }
  };

  const qualityLabel =
    station?.codec && station?.bitrate
      ? `${station.codec} ${station.bitrate} kbps`
      : station?.codec || '';

  return (
    <div className="station-display">
      <div className="sd-status">
        <span
          className={`sd-dot ${
            audioState === 'playing'
              ? 'sd-dot--on'
              : audioState === 'error'
              ? 'sd-dot--error'
              : audioState === 'blocked'
              ? 'sd-dot--loading'
              : 'sd-dot--loading'
          }`}
        />
        <span className={`sd-status-text ${isScanning ? 'scanning' : ''}`}>
          {statusText}
        </span>
        {genre && <span className="sd-genre">{genre.label}</span>}
      </div>

      {scanError && <div className="sd-error">{scanError}</div>}

      {station && (
        <>
          <div className="sd-name-row">
            {station.favicon && (
              <img
                className="sd-favicon"
                src={station.favicon}
                alt=""
                width="20"
                height="20"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <div className="sd-marquee" ref={marqueeRef}>
              <h2
                className={`sd-name ${scrollDuration > 0 ? 'sd-name--scrolling' : ''}`}
                ref={textRef}
                style={scrollDuration > 0 ? { animationDuration: `${scrollDuration}s` } : undefined}
              >
                <span className="sd-name-copy">
                  {station.name}
                  {nowPlaying && (
                    <>
                      <span className="sd-name-sep"> / </span>
                      <span className="sd-name-track">{nowPlaying}</span>
                    </>
                  )}
                </span>
                {scrollDuration > 0 && (
                  <span className="sd-name-copy" aria-hidden="true">
                    {station.name}
                    {nowPlaying && (
                      <>
                        <span className="sd-name-sep"> / </span>
                        <span className="sd-name-track">{nowPlaying}</span>
                      </>
                    )}
                  </span>
                )}
              </h2>
            </div>
            <button
              className={`sd-fav ${isFav ? 'sd-fav--active' : ''}`}
              onClick={handleFavorite}
              disabled={!isFav && favorites.isFull}
              title={
                isFav
                  ? 'Remove from favorites'
                  : favorites.isFull
                  ? 'Favorites full (5/5)'
                  : 'Add to favorites'
              }
            >
              {isFav ? '\u2605' : '\u2606'}
            </button>
          </div>
          <div className="sd-meta">
            {station.country && <span>{station.country}</span>}
            {qualityLabel && (
              <span className="sd-quality">{qualityLabel}</span>
            )}
            {nowPlaying && <FindSongButton title={nowPlaying} />}
          </div>

          {trackHistory && trackHistory.length > 0 && (
            <div className="sd-history">
              <span className="sd-history-label">Earlier</span>
              {trackHistory.map((title, i) => (
                <span key={`${title}-${i}`}>
                  {i > 0 && <span className="sd-history-sep"> / </span>}
                  <span
                    className="sd-history-item"
                    style={{ opacity: 1 - i * 0.1 }}
                  >
                    {title}
                  </span>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
