/**
 * Pure station-selection logic: which stations from a genre's pool are
 * playable here, and which one to play next. No network, no globals.
 */

export function streamUrl(station) {
  return station?.url_resolved || station?.url || '';
}

/** Keep only the fields the app uses — small enough to persist. */
export function slimStation(station) {
  return {
    stationuuid: station.stationuuid,
    name: (station.name || '').trim() || 'Unknown station',
    url: station.url || '',
    url_resolved: station.url_resolved || '',
    homepage: station.homepage || '',
    favicon: station.favicon || '',
    country: station.country || '',
    countrycode: station.countrycode || '',
    codec: station.codec || '',
    bitrate: station.bitrate || 0,
  };
}

/** Bitrate adjusted for codec efficiency, so 64k AAC isn't judged like 64k MP3. */
export function effectiveBitrate(station) {
  const bitrate = station.bitrate || 0;
  const codec = (station.codec || '').toUpperCase();
  if (/AAC|MP4A/.test(codec)) return Math.round(bitrate * 1.5);
  if (/OGG|VORBIS|OPUS/.test(codec)) return Math.round(bitrate * 1.3);
  return bitrate;
}

const isHttps = (s) => streamUrl(s).startsWith('https://');
const isExcludedCountry = (s) => (s.countrycode || '').toUpperCase() === 'RU';

/**
 * Narrow a pool to playable candidates, relaxing rules one at a time
 * rather than ever returning nothing.
 */
export function buildCandidates(stations, options = {}) {
  const {
    currentId = null,
    recentIds = [],
    mobile = false,
    maxBitrate = Infinity,
  } = options;
  const recent = new Set(recentIds);
  const fitsDevice = (s) =>
    !(mobile && /ogg|vorbis|flac/i.test(s.codec || '')) && (s.bitrate || 0) <= maxBitrate;

  const tiers = [
    // Ideal: secure, playable here, and not heard recently
    (s) => isHttps(s) && !isExcludedCountry(s) && fitsDevice(s) && !recent.has(s.stationuuid) && s.stationuuid !== currentId,
    // Allow repeats, just not the station that's on right now
    (s) => isHttps(s) && !isExcludedCountry(s) && fitsDevice(s) && s.stationuuid !== currentId,
    // Drop the device rules
    (s) => isHttps(s) && !isExcludedCountry(s),
    // Last resorts
    (s) => !isExcludedCountry(s),
    () => true,
  ];

  for (const tier of tiers) {
    const pool = stations.filter(tier);
    if (pool.length > 0) {
      // Prefer decent quality, but never at the cost of an empty pool
      const decent = pool.filter((s) => effectiveBitrate(s) >= 96 || !s.bitrate);
      return decent.length > 0 ? decent : pool;
    }
  }
  return [];
}

/** Flat random pick — variety over popularity. */
export function pickStation(stations, options = {}, random = Math.random) {
  const candidates = buildCandidates(stations, options);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(random() * candidates.length)];
}
