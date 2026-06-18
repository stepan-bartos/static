/** Build/parse shareable deep-links of the form ?g=<genreKey>&s=<stationuuid>. */

export function buildShareUrl(station, genre) {
  const params = new URLSearchParams();
  if (genre?.key) params.set('g', genre.key);
  params.set('s', station.stationuuid);
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

export function parseShareParams() {
  const params = new URLSearchParams(window.location.search);
  const s = params.get('s');
  if (!s) return null;
  return { genreKey: params.get('g'), stationuuid: s };
}

/** Strip the share params from the address bar without a reload. */
export function clearShareParams() {
  window.history.replaceState({}, '', window.location.pathname);
}
