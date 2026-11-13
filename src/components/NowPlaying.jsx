import { useState } from 'react';
import Icon from './Icon.jsx';
import Marquee from './Marquee.jsx';
import { MUSIC_SERVICES } from '../services/musicServices.js';

const STATUS_TEXT = {
  idle: 'Standby',
  scanning: 'Scanning',
  loading: 'Tuning in',
  reconnecting: 'Reconnecting',
  playing: 'On air',
  paused: 'Paused',
  blocked: 'Press play',
  error: 'Signal lost',
};

const regionNames = typeof Intl !== 'undefined' && Intl.DisplayNames
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;

function countryName(station) {
  const code = (station.countrycode || '').toUpperCase();
  if (regionNames && /^[A-Z]{2}$/.test(code)) {
    try {
      return regionNames.of(code);
    } catch {
      // unknown region code — fall through to the directory's own name
    }
  }
  return station.country || '';
}

function qualityLabel(station) {
  if (!station.bitrate) return station.codec || '';
  return `${station.codec || ''} ${station.bitrate} kbps`.trim();
}

/** Country, quality, and the two things you can do with what's playing. */
function Details({ station, nowPlaying, musicService, onFindSong, onChooseService, onShare }) {
  const [choosing, setChoosing] = useState(false);
  const country = countryName(station);
  const quality = qualityLabel(station);

  if (choosing) {
    return (
      <div className="meta meta--choosing">
        <span>Find it on</span>
        {Object.entries(MUSIC_SERVICES).map(([key, service]) => (
          <button
            key={key}
            className="link-btn"
            onClick={() => {
              setChoosing(false);
              onChooseService(key, nowPlaying);
            }}
          >
            {service.label}
          </button>
        ))}
        <button className="link-btn" onClick={() => setChoosing(false)}>Cancel</button>
      </div>
    );
  }

  return (
    <div className="meta">
      {(country || quality) && (
        <span className="meta-group">
          {country && <span>{country}</span>}
          {country && quality && <span className="meta-sep" aria-hidden="true">·</span>}
          {quality && <span>{quality}</span>}
        </span>
      )}
      {(country || quality) && <span className="meta-sep meta-gap" aria-hidden="true">·</span>}
      <span className="meta-group">
        {nowPlaying && (
          <>
            <button
              className="link-btn"
              onClick={() => (musicService ? onFindSong(nowPlaying) : setChoosing(true))}
              title={musicService ? `Search ${MUSIC_SERVICES[musicService]?.label} for this song` : 'Search for this song'}
            >
              Find song
            </button>
            <span className="meta-sep" aria-hidden="true">·</span>
          </>
        )}
        <button className="link-btn" onClick={onShare}>Share</button>
      </span>
    </div>
  );
}

export default function NowPlaying({
  status,
  offline,
  station,
  genre,
  nowPlaying,
  error,
  isFavorite,
  onToggleFavorite,
  onShare,
  musicService,
  onFindSong,
  onChooseService,
}) {
  const statusText = status === 'error' && offline ? 'Offline' : STATUS_TEXT[status];

  return (
    <section className="now" aria-label="Now playing">
      <div className="status">
        <span className="status-dot" aria-hidden="true" />
        <span>{statusText}</span>
        {station && genre && <span className="status-genre">{genre.label}</span>}
      </div>

      {station ? (
        <div className="now-body" key={station.stationuuid}>
          <div className="name-row">
            <h1 className="name" data-long={station.name.length > 26} title={station.name}>{station.name}</h1>
            <button
              className="star"
              onClick={onToggleFavorite}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              title={isFavorite ? 'Remove from favorites (F)' : 'Add to favorites (F)'}
            >
              <Icon name="star" />
            </button>
          </div>
          <div className="track">{nowPlaying && <Marquee text={nowPlaying} />}</div>
          <Details
            station={station}
            nowPlaying={nowPlaying}
            musicService={musicService}
            onFindSong={onFindSong}
            onChooseService={onChooseService}
            onShare={onShare}
          />
        </div>
      ) : (
        <div className="now-body" key="empty">
          <div className="name-row name-row--plain">
            <h1 className="name">{status === 'scanning' ? 'Scanning…' : 'Press play'}</h1>
          </div>
          <div className="track tagline">A radio, not a recommendation engine.</div>
          <div className="meta">Pick a genre below, or just press play for anything.</div>
        </div>
      )}

      {error && <p className="now-error" role="alert">{error}</p>}
    </section>
  );
}
