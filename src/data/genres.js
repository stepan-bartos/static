/** "Anything" scans across every music genre. */
export const ANY_GENRE = { key: 'any', label: 'Anything', tags: [] };

export const GENRES = [
  { key: 'indie', label: 'Indie', tags: ['indie', 'indie rock', 'indie pop'] },
  { key: 'shoegaze', label: 'Shoegaze / Dream Pop', tags: ['shoegaze', 'dream pop', 'psychedelic', 'post-rock'] },
  { key: 'singer-songwriter', label: 'Singer-Songwriter', tags: ['singer-songwriter', 'folk'] },
  { key: 'jazz', label: 'Jazz', tags: ['jazz'] },
  { key: 'bebop', label: 'Bebop & Classic Jazz', tags: ['bebop', 'hard bop', 'cool jazz', 'swing'] },
  { key: 'electronic', label: 'Electronic', tags: ['electronic', 'electronica'] },
  { key: 'ambient', label: 'Ambient', tags: ['ambient', 'chillout'] },
  { key: 'techno', label: 'Techno', tags: ['techno', 'dub techno'] },
  { key: 'house', label: 'House', tags: ['house', 'deep house'] },
  { key: 'hiphop', label: 'Hip Hop', tags: ['hip hop', 'rap', 'hip-hop'] },
  { key: 'soul', label: 'Soul & R&B', tags: ['soul', 'r&b'] },
  { key: 'funk', label: 'Funk', tags: ['funk', 'funky', 'disco'] },
  { key: 'classical', label: 'Classical', tags: ['classical'] },
  { key: 'baroque', label: 'Baroque & Early', tags: ['baroque', 'early music', 'chamber music', 'renaissance', 'medieval', 'choral'] },
  { key: 'world', label: 'World', tags: ['world music', 'world'] },
  { key: 'latin', label: 'Latin', tags: ['latin', 'salsa', 'latin music'] },
  { key: 'reggae', label: 'Reggae & Dub', tags: ['reggae', 'dub', 'roots'] },
  { key: 'stoner', label: 'Stoner Rock', tags: ['stoner rock', 'stoner', 'doom', 'sludge'] },
  { key: 'metal', label: 'Metal', tags: ['metal', 'heavy metal'] },
  { key: 'punk', label: 'Punk', tags: ['punk', 'punkrock', 'hardcore'] },
  { key: 'blues', label: 'Blues', tags: ['blues'] },
  { key: 'country', label: 'Country & Americana', tags: ['country', 'americana', 'classic country'] },
  { key: 'pop', label: 'Pop', tags: ['pop'] },
  { key: 'lofi', label: 'Lo-Fi', tags: ['lofi', 'lo-fi', 'lofi hip hop'] },
  { key: 'news', label: 'News', tags: ['news', 'news talk'], talk: true },
  { key: 'culture', label: 'Culture & Talk', tags: ['culture', 'talk', 'public radio'], talk: true },
  { key: 'science', label: 'Science & Tech', tags: ['science', 'technology', 'education'], talk: true },
  { key: 'sports', label: 'Sports', tags: ['sports', 'sport', 'football'], talk: true },
];

/** Everything the genre line shows, in order. */
export const ALL_GENRES = [ANY_GENRE, ...GENRES];

/** "Anything" never lands on talk radio. */
export const MUSIC_GENRES = GENRES.filter((g) => !g.talk);

export function findGenre(key) {
  return ALL_GENRES.find((g) => g.key === key) || null;
}
