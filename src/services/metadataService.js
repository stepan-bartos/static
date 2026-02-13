/**
 * Polls the ICY metadata proxy for "now playing" info.
 * Non-critical — all failures are silent.
 */

const PROXY_BASE =
  import.meta.env.VITE_METADATA_PROXY || 'https://static-metadata.stepan-barty-02b.workers.dev';
const POLL_INTERVAL = 15_000; // 15 seconds

let _timer = null;
let _streamUrl = null;
let _callback = null;
let _lastTitle = null;

async function _poll() {
  if (!_streamUrl) return;
  try {
    const url = `${PROXY_BASE}/api/metadata?url=${encodeURIComponent(_streamUrl)}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    if (data.title && data.title !== _lastTitle) {
      const previousTitle = _lastTitle;
      _lastTitle = data.title;
      _callback?.({ title: data.title, previousTitle });
    }
  } catch {
    // Metadata is non-critical — swallow errors
  }
}

function startPolling(streamUrl, callback) {
  stopPolling();
  _streamUrl = streamUrl;
  _callback = callback;
  _lastTitle = null;
  _poll(); // fetch immediately
  _timer = setInterval(_poll, POLL_INTERVAL);
}

function stopPolling() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
  _streamUrl = null;
  _callback = null;
  _lastTitle = null;
}

export default { startPolling, stopPolling };
