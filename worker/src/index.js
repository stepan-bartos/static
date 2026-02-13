import { getIcyMetadata } from './icy-parser.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname !== '/api/metadata') {
      return jsonResponse({ error: 'Not found' }, 404);
    }

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const streamUrl = url.searchParams.get('url');
    if (!streamUrl) {
      return jsonResponse({ error: 'Missing url parameter' }, 400);
    }

    // Validate URL — http/https only
    try {
      const parsed = new URL(streamUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return jsonResponse({ error: 'Invalid protocol — only http and https allowed' }, 400);
      }
    } catch {
      return jsonResponse({ error: 'Invalid URL' }, 400);
    }

    try {
      const metadata = await getIcyMetadata(streamUrl);
      return jsonResponse(metadata);
    } catch (err) {
      return jsonResponse(
        { error: 'Failed to fetch metadata', detail: err.message },
        502,
      );
    }
  },
};
