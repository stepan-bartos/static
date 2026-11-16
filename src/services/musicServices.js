export const MUSIC_SERVICES = {
  spotify: {
    label: 'Spotify',
    searchUrl: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}`,
  },
  apple: {
    label: 'Apple Music',
    searchUrl: (q) => `https://music.apple.com/search?term=${encodeURIComponent(q)}`,
  },
  youtube: {
    label: 'YouTube Music',
    searchUrl: (q) => `https://music.youtube.com/search?q=${encodeURIComponent(q)}`,
  },
};

/** Open in a new tab via a real anchor click — avoids the blank-tab flash of window.open. */
export function openLink(url) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.click();
}

// ── Apple Music ──
// A search link is fine in a browser, but on a Mac or iPhone the link is
// handed to the Music app, which opens without running the search. Links to a
// specific song work everywhere, so look the song up first and link to it.

const APPLE_LOOKUP_TIMEOUT = 2500;
const appleLookups = new Map(); // title → Promise<string>
const appleUrls = new Map(); // title → address, once known

/** Lowercase, no accents, no punctuation, no "(Radio Edit)"-style extras. */
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[([{].*?[)\]}]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function containsWords(haystack, needle) {
  return needle !== '' && ` ${haystack} `.includes(` ${needle} `);
}

/**
 * From Apple's search results, the first song whose artist and name both
 * appear in the radio's title. Anything less certain returns null — a search
 * page is better than confidently opening the wrong song.
 */
export function pickAppleMatch(title, results) {
  const wanted = normalize(title);
  for (const result of results ?? []) {
    if (!result?.trackViewUrl) continue;
    const leadArtist = String(result.artistName ?? '').split(/\s*(?:,|&|\bfeat\.?|\bfeaturing\b)\s*/i)[0];
    if (containsWords(wanted, normalize(leadArtist)) && containsWords(wanted, normalize(result.trackName))) {
      return result.trackViewUrl.replace(/[?&]uo=\d+/, '');
    }
  }
  return null;
}

/** Apple's two-letter store for this person, guessed from their language. */
export function appleStorefront(language) {
  try {
    const region = new Intl.Locale(language).maximize().region;
    return /^[A-Z]{2}$/.test(region ?? '') ? region.toLowerCase() : 'us';
  } catch {
    return 'us';
  }
}

async function lookUpAppleUrl(title) {
  const store = appleStorefront(navigator.language);
  const query = new URLSearchParams({ term: title, entity: 'song', limit: '5', country: store });
  const response = await fetch(`https://itunes.apple.com/search?${query}`, {
    signal: AbortSignal.timeout(APPLE_LOOKUP_TIMEOUT),
  });
  if (!response.ok) throw new Error(`Apple lookup failed: ${response.status}`);
  const { results } = await response.json();
  return pickAppleMatch(title, results)
    ?? `https://music.apple.com/${store}/search?term=${encodeURIComponent(title)}`;
}

/** Where to send someone for this title: the song itself, or failing that a search. Never rejects. */
function resolveAppleUrl(title) {
  if (!appleLookups.has(title)) {
    const lookup = lookUpAppleUrl(title).then(
      (url) => {
        appleUrls.set(title, url);
        return url;
      },
      () => {
        appleLookups.delete(title); // let the next click try again
        return MUSIC_SERVICES.apple.searchUrl(title);
      },
    );
    appleLookups.set(title, lookup);
  }
  return appleLookups.get(title);
}

function openAppleSong(title) {
  const known = appleUrls.get(title);
  if (known) {
    openLink(known);
    return;
  }
  // The tab has to open during the click or browsers block it; fill it in
  // once the lookup answers.
  const tab = window.open('', '_blank');
  if (!tab) {
    openLink(MUSIC_SERVICES.apple.searchUrl(title));
    return;
  }
  tab.opener = null;
  resolveAppleUrl(title).then((url) => {
    if (!tab.closed) tab.location.replace(url);
  });
}

/**
 * Get ready for a click on "find song" so the link can open instantly.
 * Only Apple Music needs it, and nothing is sent unless that's the chosen service.
 */
export function prepareSong(serviceKey, title) {
  if (serviceKey === 'apple' && title) resolveAppleUrl(title);
}

export function findSong(serviceKey, title) {
  const service = MUSIC_SERVICES[serviceKey];
  if (!service || !title) return;
  if (serviceKey === 'apple') openAppleSong(title);
  else openLink(service.searchUrl(title));
}
