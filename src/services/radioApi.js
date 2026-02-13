const API_MIRRORS = [
  'https://de1.api.radio-browser.info',
  'https://fr1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
];

let currentMirror = 0;

async function apiFetch(path, params = {}) {
  const url = new URL(path, API_MIRRORS[currentMirror]);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    // Rotate to next mirror and retry once
    currentMirror = (currentMirror + 1) % API_MIRRORS.length;
    const retryUrl = new URL(path, API_MIRRORS[currentMirror]);
    Object.entries(params).forEach(([k, v]) => retryUrl.searchParams.set(k, v));
    const retryResponse = await fetch(retryUrl);
    if (!retryResponse.ok) throw error;
    return await retryResponse.json();
  }
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

  // Sort by bitrate descending (prefer higher quality), then by votes
  const sorted = pool.sort((a, b) => {
    const bitDiff = (b.bitrate || 0) - (a.bitrate || 0);
    if (bitDiff !== 0) return bitDiff;
    return (b.votes || 0) - (a.votes || 0);
  });

  // Pick randomly from top 30 (balances quality with variety)
  const topN = Math.min(30, sorted.length);
  const candidates = sorted.slice(0, topN);
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index];
}
