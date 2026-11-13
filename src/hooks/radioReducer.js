const BACK_LIMIT = 20;

export const initialRadioState = {
  selection: 'any', // genre key the Scan button draws from
  station: null,
  stationGenreKey: null, // genre the current station actually came from
  isScanning: false,
  audioState: 'idle', // idle | loading | playing | paused | blocked | error
  reconnecting: false,
  error: null,
  nowPlaying: null,
  backStack: [], // stations to return to with "previous"
};

export function radioReducer(state, action) {
  switch (action.type) {
    case 'SELECT':
      return { ...state, selection: action.selection };

    case 'SCAN_START':
      return { ...state, isScanning: true, error: null };

    case 'SCAN_ERROR':
      return { ...state, isScanning: false, error: action.error };

    case 'STATION': {
      let backStack = state.backStack;
      if (action.history === 'pop') {
        backStack = backStack.slice(1);
      } else if (state.station && state.station.stationuuid !== action.station.stationuuid) {
        const leaving = { station: state.station, genreKey: state.stationGenreKey };
        backStack = [
          leaving,
          ...backStack.filter((entry) => entry.station.stationuuid !== leaving.station.stationuuid),
        ].slice(0, BACK_LIMIT);
      }
      return {
        ...state,
        station: action.station,
        stationGenreKey: action.genreKey,
        isScanning: false,
        audioState: 'loading',
        reconnecting: false,
        error: null,
        nowPlaying: null,
        backStack,
      };
    }

    case 'AUDIO':
      return {
        ...state,
        audioState: action.audioState,
        reconnecting: action.audioState === 'loading' ? state.reconnecting : false,
      };

    case 'RECONNECTING':
      return { ...state, audioState: 'loading', reconnecting: true };

    case 'TRACK':
      return { ...state, nowPlaying: action.title };

    default:
      return state;
  }
}
