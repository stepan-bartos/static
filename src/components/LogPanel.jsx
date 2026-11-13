import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { MUSIC_SERVICES } from '../services/musicServices.js';
import { findGenre } from '../data/genres.js';

const timeFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });

function formatWhen(timestamp) {
  try {
    return timeFormat.format(new Date(timestamp));
  } catch {
    return '';
  }
}

/** A slide-in record of what you've heard: tracks you can look up, stations you can return to. */
export default function LogPanel({
  open,
  onClose,
  tracks,
  stations,
  musicService,
  onChooseService,
  onFindSong,
  onPlayStation,
  onClear,
}) {
  const [tab, setTab] = useState('tracks');
  const [pendingTitle, setPendingTitle] = useState(null); // a song waiting for a service to be picked
  const closeRef = useRef(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  const handleFind = (title) => {
    if (musicService) onFindSong(title);
    else setPendingTitle(title);
  };

  const handleService = (key) => {
    onChooseService(key, pendingTitle);
    setPendingTitle(null);
  };

  const empty = tab === 'tracks' ? tracks.length === 0 : stations.length === 0;

  return (
    <>
      <div className="scrim" data-open={open} onClick={onClose} aria-hidden="true" />
      <aside
        className="log"
        data-open={open}
        inert={!open}
        role="dialog"
        aria-modal="true"
        aria-label="Listening log"
      >
        <div className="log-head" role="tablist" aria-label="Log">
          <button className="log-tab" role="tab" aria-selected={tab === 'tracks'} onClick={() => setTab('tracks')}>
            Tracks
          </button>
          <button className="log-tab" role="tab" aria-selected={tab === 'stations'} onClick={() => setTab('stations')}>
            Stations
          </button>
          <button className="log-close" ref={closeRef} onClick={onClose} aria-label="Close log" title="Close (Esc)">
            <Icon name="close" />
          </button>
        </div>

        {empty ? (
          <p className="log-empty">
            {tab === 'tracks'
              ? 'Songs appear here as they play, so you can look one up later. Not every station announces its tracks.'
              : 'Stations you listen to appear here, so you can find your way back.'}
          </p>
        ) : tab === 'tracks' ? (
          <ul className="log-list">
            {tracks.map((entry) => (
              <li className="log-row" key={`${entry.at}-${entry.title}`}>
                <div className="log-main">
                  <div className="log-title">{entry.title}</div>
                  <div className="log-sub">{entry.station} · {formatWhen(entry.at)}</div>
                </div>
                <button className="log-action" onClick={() => handleFind(entry.title)} aria-label={`Find “${entry.title}”`}>
                  Find ↗
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="log-list">
            {stations.map((station) => (
              <li className="log-row" key={station.stationuuid}>
                <button
                  className="log-main log-station"
                  onClick={() => {
                    onPlayStation(station);
                    onClose();
                  }}
                >
                  <div className="log-title">{station.name}</div>
                  <div className="log-sub">
                    {[findGenre(station.genreKey)?.label, formatWhen(station.at)].filter(Boolean).join(' · ')}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="log-foot" data-nudge={pendingTitle !== null}>
          <div className="log-foot-row">
            <span className="log-foot-label">{pendingTitle !== null ? 'Choose where to look:' : 'Find songs on'}</span>
            {Object.entries(MUSIC_SERVICES).map(([key, service]) => (
              <button
                key={key}
                className="service"
                aria-pressed={musicService === key}
                onClick={() => handleService(key)}
              >
                {service.label}
              </button>
            ))}
            {!empty && (
              <button className="service log-clear" onClick={onClear}>Clear log</button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
