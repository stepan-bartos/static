/**
 * Polls the ICY metadata proxy for "now playing" info.
 * Non-critical — all failures are silent.
 */

const PROXY_BASE =
  import.meta.env.VITE_METADATA_PROXY || 'https://static-metadata.stepan-barty-02b.workers.dev';
const POLL_INTERVAL = 15_000;

let timer = null;
let generation = 0;

export function startPolling(streamUrl, onTitle) {
  stopPolling();
  const mine = generation;
  let lastTitle = null;

  const poll = async () => {
    try {
      const res = await fetch(`${PROXY_BASE}/api/metadata?url=${encodeURIComponent(streamUrl)}`);
      if (!res.ok) return;
      const data = await res.json();
      // A slow answer for a station we've already left must not leak into the next one
      if (mine !== generation) return;
      const title = typeof data.title === 'string' ? data.title.trim() : '';
      if (title && title !== lastTitle) {
        lastTitle = title;
        onTitle(title);
      }
    } catch {
      // Metadata is non-critical — swallow errors
    }
  };

  poll();
  timer = setInterval(poll, POLL_INTERVAL);
}

export function stopPolling() {
  generation += 1;
  clearInterval(timer);
  timer = null;
}
