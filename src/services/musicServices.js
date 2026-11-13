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

export function findSong(serviceKey, title) {
  const service = MUSIC_SERVICES[serviceKey];
  if (service && title) openLink(service.searchUrl(title));
}
