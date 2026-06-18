// `all` is a round-robin DNS endpoint that load-balances across healthy
// servers; the named mirrors are fallbacks in case it's unavailable.
const API_MIRRORS = [
  'https://all.api.radio-browser.info',
  'https://de1.api.radio-browser.info',
];

let currentMirror = 0;

async function apiFetch(path, params = {}) {
  let lastError;
  // Try each mirror in turn, starting from the last known-good one.
  for (let i = 0; i < API_MIRRORS.length; i++) {
    const mirror = API_MIRRORS[(currentMirror + i) % API_MIRRORS.length];
    const url = new URL(path, mirror);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      // Remember the mirror that worked for subsequent calls.
      currentMirror = (currentMirror + i) % API_MIRRORS.length;
      return data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function searchStationsByTag(tag, limit = 100) {
  return apiFetch('/json/stations/search', {
    tag,
    hidebroken: 'true',
    lastcheckok: '1',
    order: 'votes',
    reverse: 'true',
    limit: String(limit),
  });
}

async function searchStationsByTags(tags, limit = 100) {
  const results = await Promise.all(
    tags.map((tag) => searchStationsByTag(tag, limit))
  );
  // Merge and deduplicate by stationuuid
  const seen = new Set();
  const merged = [];
  for (const stationList of results) {
    for (const station of stationList) {
      if (!seen.has(station.stationuuid)) {
        seen.add(station.stationuuid);
        merged.push(station);
      }
    }
  }
  return merged;
}

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export async function getRandomStation(genre, excludeId = null) {
  const stations = await searchStationsByTags(genre.tags, 100);
  if (stations.length === 0) {
    throw new Error(`No stations found for ${genre.label}`);
  }

  // Filter: HTTPS only (HTTP blocked as mixed content), no Russian stations,
  // exclude currently playing station, mobile codec check
  let pool = stations.filter((s) => {
    const url = s.url_resolved || s.url || '';
    if (!url.startsWith('https://')) return false;
    if ((s.countrycode || '').toUpperCase() === 'RU') return false;
    if (excludeId && s.stationuuid === excludeId) return false;
    if (isMobile && /ogg|vorbis/i.test(s.codec || '')) return false;
    return true;
  });

  // Fallback: HTTPS + no RU (drop excludeId and codec filter)
  if (pool.length === 0) {
    pool = stations.filter((s) => {
      const url = s.url_resolved || s.url || '';
      return url.startsWith('https://') && (s.countrycode || '').toUpperCase() !== 'RU';
    });
  }
  // Last resort: anything non-RU
  if (pool.length === 0) {
    pool = stations.filter((s) => (s.countrycode || '').toUpperCase() !== 'RU');
  }
  if (pool.length === 0) pool = stations;

  // Effective bitrate accounting for codec efficiency
  function effectiveBitrate(s) {
    let br = s.bitrate || 0;
    const codec = (s.codec || '').toUpperCase();
    if (/AAC|AAC\+|HE-AAC|MP4A/.test(codec)) br = Math.round(br * 1.5);
    if (/OGG|VORBIS|OPUS/.test(codec)) br = Math.round(br * 1.3);
    return br;
  }

  // Filter out low-quality streams (below ~128kbps effective), keep the rest
  const decent = pool.filter((s) => effectiveBitrate(s) >= 96 || s.bitrate === 0);
  const candidates = decent.length > 0 ? decent : pool;

  // Flat random pick — variety over quality
  return candidates[Math.floor(Math.random() * candidates.length)];
}
