/**
 * Raw ICY metadata parser — zero dependencies.
 *
 * Connects to an internet radio stream with `Icy-Metadata: 1`,
 * reads just enough data to extract the first metadata block,
 * then aborts the connection.
 */

const MAX_METAINT = 65536;
const TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 3; // try up to 3 metadata blocks if first is empty

export async function getIcyMetadata(streamUrl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(streamUrl, {
      headers: { 'Icy-Metadata': '1', 'User-Agent': 'Static/2.0' },
      signal: controller.signal,
      redirect: 'follow',
    });

    const metaint = parseInt(response.headers.get('icy-metaint'), 10);
    const icyName = response.headers.get('icy-name') || null;
    const icyBr = response.headers.get('icy-br') || null;

    if (!metaint || isNaN(metaint) || metaint > MAX_METAINT) {
      // Server doesn't support ICY or metaint is unreasonably large
      controller.abort();
      return { title: null, station: icyName, bitrate: icyBr };
    }

    const reader = response.body.getReader();
    let buffer = new Uint8Array(0);

    const appendChunk = (chunk) => {
      const next = new Uint8Array(buffer.length + chunk.length);
      next.set(buffer);
      next.set(chunk, buffer.length);
      buffer = next;
    };

    // We may need to read past multiple metadata blocks if the first is empty
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const blockStart = attempt * (metaint + 1) + attempt > 0
        ? buffer.length // continue from where we are
        : 0;

      // Target: need (attempt+1) * metaint bytes of audio + metadata blocks
      const needed = (attempt + 1) * metaint + (attempt + 1); // +1 for each length byte

      // Read until we have enough data
      while (buffer.length < needed + 4080) { // 4080 = max metadata size
        const { done, value } = await reader.read();
        if (done) {
          reader.releaseLock();
          controller.abort();
          return { title: null, station: icyName, bitrate: icyBr };
        }
        appendChunk(value);
      }

      // Calculate where this metadata block starts
      // Block N is at offset: N * metaint + sum of previous meta overhead
      // For simplicity, parse sequentially from the start
      let offset = 0;
      let title = null;

      for (let b = 0; b <= attempt; b++) {
        // Skip metaint bytes of audio
        offset += metaint;

        if (offset >= buffer.length) break;

        // Read length byte
        const metaLengthByte = buffer[offset];
        offset += 1;
        const metaLength = metaLengthByte * 16;

        if (metaLength === 0) {
          // Empty metadata block
          if (b === attempt) {
            title = null; // This attempt's block is empty
          }
          continue;
        }

        if (offset + metaLength > buffer.length) break;

        const metaBytes = buffer.slice(offset, offset + metaLength);
        offset += metaLength;

        // Try UTF-8 first, fall back to Latin-1
        let metaString;
        try {
          metaString = new TextDecoder('utf-8', { fatal: true }).decode(metaBytes);
        } catch {
          metaString = new TextDecoder('iso-8859-1').decode(metaBytes);
        }

        // Strip null bytes
        metaString = metaString.replace(/\0/g, '');

        const titleMatch = metaString.match(/StreamTitle='([^']*)'/);
        if (titleMatch && titleMatch[1].trim()) {
          title = titleMatch[1].trim();
        }
      }

      if (title) {
        reader.releaseLock();
        controller.abort();
        return { title, station: icyName, bitrate: icyBr };
      }
    }

    // Exhausted attempts — no metadata found
    reader.releaseLock();
    controller.abort();
    return { title: null, station: icyName, bitrate: icyBr };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { title: null, station: null, bitrate: null, error: 'timeout' };
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    controller.abort();
  }
}
