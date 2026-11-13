import { describe, expect, it } from 'vitest';
import { buildCandidates, effectiveBitrate, pickStation, slimStation, streamUrl } from '../stationPicker.js';

const station = (id, overrides = {}) => ({
  stationuuid: id,
  name: `Station ${id}`,
  url_resolved: `https://example.com/${id}`,
  countrycode: 'DE',
  codec: 'MP3',
  bitrate: 128,
  ...overrides,
});

const ids = (list) => list.map((s) => s.stationuuid);

describe('streamUrl', () => {
  it('prefers the resolved URL and falls back to the listed one', () => {
    expect(streamUrl({ url: 'a', url_resolved: 'b' })).toBe('b');
    expect(streamUrl({ url: 'a', url_resolved: '' })).toBe('a');
    expect(streamUrl(null)).toBe('');
  });
});

describe('effectiveBitrate', () => {
  it('credits efficient codecs', () => {
    expect(effectiveBitrate({ codec: 'MP3', bitrate: 96 })).toBe(96);
    expect(effectiveBitrate({ codec: 'AAC+', bitrate: 64 })).toBe(96);
    expect(effectiveBitrate({ codec: 'OGG', bitrate: 100 })).toBe(130);
  });
});

describe('buildCandidates', () => {
  it('drops insecure streams, the excluded country, and the current station', () => {
    const pool = [
      station('a'),
      station('b', { url_resolved: 'http://example.com/b' }),
      station('c', { countrycode: 'RU' }),
      station('d'),
    ];
    expect(ids(buildCandidates(pool, { currentId: 'a' }))).toEqual(['d']);
  });

  it('avoids recently played stations while there are others', () => {
    const pool = [station('a'), station('b'), station('c')];
    expect(ids(buildCandidates(pool, { recentIds: ['a', 'b'] }))).toEqual(['c']);
  });

  it('allows repeats once everything has been heard, but still not the current station', () => {
    const pool = [station('a'), station('b')];
    expect(ids(buildCandidates(pool, { currentId: 'a', recentIds: ['a', 'b'] }))).toEqual(['b']);
  });

  it('skips phone-unfriendly codecs and very high bitrates on mobile', () => {
    const pool = [
      station('a', { codec: 'OGG' }),
      station('b', { codec: 'FLAC', bitrate: 1411 }),
      station('c', { bitrate: 320 }),
    ];
    expect(ids(buildCandidates(pool, { mobile: true, maxBitrate: 320 }))).toEqual(['c']);
    expect(ids(buildCandidates(pool))).toEqual(['a', 'b', 'c']);
  });

  it('prefers decent quality but keeps low-bitrate stations if that is all there is', () => {
    const low = station('low', { bitrate: 32 });
    expect(ids(buildCandidates([low, station('ok')]))).toEqual(['ok']);
    expect(ids(buildCandidates([low]))).toEqual(['low']);
  });

  it('relaxes its rules rather than returning nothing', () => {
    const insecure = station('x', { url_resolved: 'http://example.com/x' });
    expect(ids(buildCandidates([insecure]))).toEqual(['x']);
    expect(buildCandidates([])).toEqual([]);
  });
});

describe('pickStation', () => {
  it('picks from the candidates using the supplied randomness', () => {
    const pool = [station('a'), station('b'), station('c')];
    expect(pickStation(pool, {}, () => 0).stationuuid).toBe('a');
    expect(pickStation(pool, {}, () => 0.99).stationuuid).toBe('c');
    expect(pickStation([], {})).toBeNull();
  });
});

describe('slimStation', () => {
  it('keeps only what the app needs and tolerates missing fields', () => {
    const slim = slimStation({ stationuuid: 'a', name: '  Radio  ', url: 'u', votes: 99, tags: 'x' });
    expect(slim).toEqual({
      stationuuid: 'a',
      name: 'Radio',
      url: 'u',
      url_resolved: '',
      homepage: '',
      favicon: '',
      country: '',
      countrycode: '',
      codec: '',
      bitrate: 0,
    });
  });
});
