import { getIcyMetadata } from './icy-parser.js';

const CACHE_SECONDS = 10; // listeners of the same station share one upstream read

/**
 * CORS: open to any origin by default. Set ALLOWED_ORIGINS (comma-separated,
 * e.g. "https://static-radio.pages.dev,http://localhost:5173") in the Worker's
 * variables to answer only for those sites.
 */
function corsHeaders(request, env) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  const allowed = (env?.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
  if (allowed.length === 0) {
    headers['Access-Control-Allow-Origin'] = '*';
    return headers;
  }
  const origin = request.headers.get('Origin');
  headers.Vary = 'Origin';
  if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function jsonResponse(data, status, cors, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', ...extra },
  });
}

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request, env);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    if (url.pathname !== '/api/metadata') {
      return jsonResponse({ error: 'Not found' }, 404, cors);
    }

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405, cors);
    }

    const streamUrl = url.searchParams.get('url');
    if (!streamUrl) {
      return jsonResponse({ error: 'Missing url parameter' }, 400, cors);
    }

    // Validate URL — http/https only
    try {
      const parsed = new URL(streamUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return jsonResponse({ error: 'Invalid protocol — only http and https allowed' }, 400, cors);
      }
    } catch {
      return jsonResponse({ error: 'Invalid URL' }, 400, cors);
    }

    // Answer from the edge cache when another listener asked moments ago.
    // The cached copy holds only the metadata; CORS headers are added per request.
    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const cacheKey = new Request(`https://static-metadata.cache/?url=${encodeURIComponent(streamUrl)}`);
    if (cache) {
      const hit = await cache.match(cacheKey);
      if (hit) return jsonResponse(await hit.json(), 200, cors, { 'X-Cache': 'HIT' });
    }

    try {
      const metadata = await getIcyMetadata(streamUrl);
      if (cache) {
        const stored = new Response(JSON.stringify(metadata), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_SECONDS}` },
        });
        ctx?.waitUntil(cache.put(cacheKey, stored));
      }
      return jsonResponse(metadata, 200, cors, { 'X-Cache': 'MISS' });
    } catch (err) {
      return jsonResponse({ error: 'Failed to fetch metadata', detail: err.message }, 502, cors);
    }
  },
};
