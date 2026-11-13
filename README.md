# Static

A radio, not a recommendation engine. Pick a genre (or leave it on *Anything*),
press Scan, and land on a live station somewhere in the world.

Live at https://static-radio.pages.dev

## What's in the box

- **Scan** picks a random station from the chosen genre. Station lists come from
  the community-run [Radio Browser](https://www.radio-browser.info) directory.
- **Now playing** titles are read from the stream itself by a small Cloudflare
  Worker (`worker/`), since browsers can't read that data directly.
- **Favorites** (up to 10), a **listening log** of tracks and stations, a
  **sleep timer** that fades out, shareable station links, keyboard shortcuts
  (press `?`), and lock-screen / media-key controls.
- Everything is stored in the browser. There are no accounts and no server-side state.

## Running it

```bash
npm install
npm run dev
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Unit tests (station picking, radio state) |
| `npm run lint` | ESLint |

## Deploying

The site does **not** deploy on push. Build it, then publish `dist/` to Cloudflare Pages:

```bash
npm run build
npx wrangler pages deploy dist --project-name static-radio
```

The metadata worker deploys separately:

```bash
cd worker
npm install
npm run deploy
```

By default the worker answers requests from any site. To limit it to your own,
set an `ALLOWED_ORIGINS` variable on the worker, for example
`https://static-radio.pages.dev,http://localhost:5173`.

To point the app at a different worker, set `VITE_METADATA_PROXY` at build time.

## How it's put together

```
src/
  App.jsx                 composition: wires the hooks to the components
  data/genres.js          the genre list and the Radio Browser tags behind each one
  services/
    audioPlayer.js        the single <audio> element; turns media events into simple states
    radioApi.js           Radio Browser client, with a per-genre cache
    stationPicker.js      pure logic: which stations are playable here, and which comes next
    metadataService.js    polls the worker for the current track title
    mediaSession.js       lock-screen / media-key integration
    shareLink.js          ?g=<genre>&s=<station> deep links
  hooks/
    useRadio.js           the radio itself: scanning, playing, recovering from dead streams
    radioReducer.js       its state transitions (unit tested)
    useFavorites.js       favorites, mirrored to a cookie so Safari doesn't evict them
    useHistoryLog.js      tracks heard and stations visited
    useSleepTimer.js, useVolume.js, useKeyboardShortcuts.js, …
  components/             NowPlaying, Dial, Favorites, GenreLine, LogPanel, …
worker/                   Cloudflare Worker that reads ICY "now playing" metadata
scripts/make-icons.py     regenerates the app icons and link-preview image
```

### When a stream fails

Live streams die and drop often, so the player decides "is it really playing?"
by whether playback time keeps advancing. When a station fails:

- one you were **listening to** is reconnected a few times before anything else happens;
- a **scanned** station that never starts is skipped for another one (up to five in a row);
- a **favorite or shared** station is never swapped out — it shows "Signal lost" and a retry button.
