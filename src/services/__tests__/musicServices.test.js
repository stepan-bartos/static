import { describe, expect, it } from 'vitest';
import { appleStorefront, normalize, pickAppleMatch } from '../musicServices.js';

const song = (artistName, trackName, id = 1) => ({
  artistName,
  trackName,
  trackViewUrl: `https://music.apple.com/us/album/x/${id}?i=${id}&uo=4`,
});

describe('normalize', () => {
  it('drops accents, punctuation and bracketed extras', () => {
    expect(normalize('Beyoncé – Déjà Vu (Radio Edit) [feat. JAY-Z]')).toBe('beyonce deja vu');
  });
});

describe('pickAppleMatch', () => {
  it('picks the song whose artist and name are both in the title', () => {
    const results = [song('Someone Else', 'Around the World', 1), song('Daft Punk', 'Around the World (Radio Edit)', 2)];
    expect(pickAppleMatch('Daft Punk - Around the World', results)).toBe('https://music.apple.com/us/album/x/2?i=2');
  });

  it('works when the station puts the title first', () => {
    expect(pickAppleMatch('Around the World - Daft Punk', [song('Daft Punk', 'Around the World')])).not.toBeNull();
  });

  it('matches on the lead artist when Apple lists several', () => {
    const results = [song('Daft Punk, Pharrell Williams & Nile Rodgers', 'Get Lucky')];
    expect(pickAppleMatch('Daft Punk feat. Pharrell - Get Lucky', results)).not.toBeNull();
  });

  it('refuses a result that only shares the song name', () => {
    expect(pickAppleMatch('Nina Simone - Feeling Good', [song('Michael Bublé', 'Feeling Good')])).toBeNull();
  });

  it('does not match on part of a word', () => {
    expect(pickAppleMatch('Moby - Porcelain', [song('M', 'Porcelain')])).toBeNull();
  });

  it('returns null when there is nothing to go on', () => {
    expect(pickAppleMatch('Station ID', [])).toBeNull();
    expect(pickAppleMatch('Station ID', undefined)).toBeNull();
  });
});

describe('appleStorefront', () => {
  it('uses the region in the language tag', () => {
    expect(appleStorefront('en-GB')).toBe('gb');
  });

  it('guesses a region for a bare language', () => {
    expect(appleStorefront('cs')).toBe('cz');
  });

  it('falls back to the US store', () => {
    expect(appleStorefront(undefined)).toBe('us');
    expect(appleStorefront('not a language')).toBe('us');
  });
});
