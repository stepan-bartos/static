import { describe, expect, it } from 'vitest';
import { initialRadioState, radioReducer } from '../radioReducer.js';

const st = (id) => ({ stationuuid: id, name: id });
const play = (state, id, genreKey = 'jazz', history = 'push') =>
  radioReducer(state, { type: 'STATION', station: st(id), genreKey, history });

describe('radioReducer', () => {
  it('starting a station clears scanning, errors and the previous track title', () => {
    let state = radioReducer(initialRadioState, { type: 'SCAN_START' });
    state = { ...state, nowPlaying: 'Old song', error: 'Old error' };
    state = play(state, 'a');
    expect(state).toMatchObject({
      station: st('a'),
      stationGenreKey: 'jazz',
      isScanning: false,
      audioState: 'loading',
      error: null,
      nowPlaying: null,
    });
  });

  it('remembers stations you leave so "previous" can return to them', () => {
    let state = play(initialRadioState, 'a', 'jazz');
    state = play(state, 'b', 'techno');
    state = play(state, 'c', 'techno');
    expect(state.backStack.map((e) => e.station.stationuuid)).toEqual(['b', 'a']);
    expect(state.backStack[1].genreKey).toBe('jazz');
  });

  it('going back pops the stack instead of growing it', () => {
    let state = play(initialRadioState, 'a');
    state = play(state, 'b');
    state = play(state, 'a', 'jazz', 'pop');
    expect(state.station.stationuuid).toBe('a');
    expect(state.backStack).toEqual([]);
  });

  it('does not stack the same station twice', () => {
    let state = play(initialRadioState, 'a');
    state = play(state, 'b');
    state = play(state, 'a');
    state = play(state, 'b');
    expect(state.backStack.map((e) => e.station.stationuuid)).toEqual(['a', 'b']);
  });

  it('a scan error stops scanning and keeps the current station', () => {
    let state = play(initialRadioState, 'a');
    state = radioReducer(state, { type: 'SCAN_START' });
    state = radioReducer(state, { type: 'SCAN_ERROR', error: 'No stations' });
    expect(state).toMatchObject({ isScanning: false, error: 'No stations', station: st('a') });
  });

  it('shows "reconnecting" until the stream is audible again', () => {
    let state = play(initialRadioState, 'a');
    state = radioReducer(state, { type: 'RECONNECTING' });
    expect(state.reconnecting).toBe(true);
    state = radioReducer(state, { type: 'AUDIO', audioState: 'loading' });
    expect(state.reconnecting).toBe(true);
    state = radioReducer(state, { type: 'AUDIO', audioState: 'playing' });
    expect(state).toMatchObject({ reconnecting: false, audioState: 'playing' });
  });

  it('choosing a genre only changes what Scan draws from', () => {
    let state = play(initialRadioState, 'a', 'jazz');
    state = radioReducer(state, { type: 'SELECT', selection: 'techno' });
    expect(state).toMatchObject({ selection: 'techno', stationGenreKey: 'jazz', station: st('a') });
  });
});
