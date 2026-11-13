import { MUSIC_GENRES } from '../data/genres.js';

// `all` is a round-robin DNS endpoint that load-balances across healthy
// servers; the named mirror is a fallback in case it's unavailable.
const API_MIRRORS = [
  'https://all.api.radio-browser.info',
  'https://de1.api.radio-browser.info',
];
const REQUEST_TIMEOUT = 8000;
const POOL_TTL = 15 * 60 * 1000;

let currentMirror = 0;

async function apiFetch(path, params = {}) {
  let lastError;
  // Try each mirror in turn, starting from the last known-good one.
  for (let i = 0; i < API_MIRRORS.length; i++) {
    const index = (currentMirror + i) % API_MIRRORS.length;
    const url = new URL(path, API_MIRRORS[index]);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      currentMirror = index;
      return data;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function searchStationsByTag(tag, limit = 100) {
  return apiFetch('/json/stations/search', {
    tag,
    hidebroken: 'true',
    lastcheckok: '1',
    order: 'votes',
    reverse: 'true',
    limit: String(limit),
  });
}

async function searchStationsByTags(tags) {
  const results = await Promise.all(tags.map((tag) => searchStationsByTag(tag)));
  const seen = new Set();
  const merged = [];
  for (const list of results) {
    for (const station of list) {
      if (!seen.has(station.stationuuid)) {
        seen.add(station.stationuuid);
        merged.push(station);
      }
    }
  }
  return merged;
}

// Station lists barely change minute to minute, so each genre's pool is
// fetched once and reused — repeat scans are instant and kinder to the API.
const poolCache = new Map();

export function fetchGenrePool(genre) {
  const hit = poolCache.get(genre.key);
  if (hit && Date.now() - hit.at < POOL_TTL) return hit.promise;
  const promise = searchStationsByTags(genre.tags).catch((error) => {
    poolCache.delete(genre.key);
    throw error;
  });
  poolCache.set(genre.key, { at: Date.now(), promise });
  return promise;
}

export function randomMusicGenre() {
  return MUSIC_GENRES[Math.floor(Math.random() * MUSIC_GENRES.length)];
}

// Fetch a single station by its UUID (used for shared deep-links).
export async function searchStationByUuid(uuid) {
  const stations = await apiFetch('/json/stations/byuuid', { uuids: uuid });
  return Array.isArray(stations) && stations.length > 0 ? stations[0] : null;
}

/** Radio Browser asks players to report listens; it feeds their popularity data. */
export function reportClick(uuid) {
  if (!uuid) return;
  fetch(`${API_MIRRORS[currentMirror]}/json/url/${encodeURIComponent(uuid)}`).catch(() => {});
}

const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

/** Device limits for station picking: codecs phones can't play, and a bitrate ceiling. */
export function deviceLimits() {
  const saveData = typeof navigator !== 'undefined' && navigator.connection?.saveData;
  return {
    mobile: isMobile,
    maxBitrate: saveData ? 128 : isMobile ? 320 : Infinity,
  };
}
