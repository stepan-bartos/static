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

export async function getRandomStation(genre) {
  const stations = await searchStationsByTags(genre.tags, 100);
  if (stations.length === 0) {
    throw new Error(`No stations found for ${genre.label}`);
  }

  // On mobile: prefer HTTPS streams and codecs Safari/Chrome can decode
  let pool = stations;
  if (isMobile) {
    const compatible = stations.filter((s) => {
      const url = s.url_resolved || s.url || '';
      const isHttps = url.startsWith('https://');
      // iOS Safari cannot decode Ogg Vorbis
      const hasCompatibleCodec = !(/ogg|vorbis/i.test(s.codec || ''));
      return isHttps && hasCompatibleCodec;
    });
    if (compatible.length > 0) pool = compatible;
  }

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
