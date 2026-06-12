/**
 * discord-fetch.cjs — shared robust fetch for Discord REST.
 *
 * Single source of truth for retry behavior so it can't drift between
 * scripts (fetch-role-stats, fetch-activity, ...). Retries on 429
 * (honoring Retry-After), 5xx, and network errors with linear backoff.
 */
const DISCORD_API = 'https://discord.com/api/v10';
const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * fetch with retry. Returns the Response, or throws if it can't succeed.
 * @param {string} url
 * @param {object} opts  { token, maxAttempts=8 }
 */
async function fetchWithRetry(url, { token, maxAttempts = 8 } = {}) {
  let res;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      res = await fetch(url, { headers: { Authorization: `Bot ${token}` } });
    } catch (e) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (res.ok) return res;
    if (res.status === 429) {
      const wait = parseFloat(res.headers.get('Retry-After') || '1');
      await sleep(wait * 1000 + 200);
      continue;
    }
    if (res.status >= 500) { await sleep(1000 * (attempt + 1)); continue; }
    // non-retryable 4xx
    throw new Error(`${url} -> ${res.status} (non-retryable)`);
  }
  throw new Error(`${url} -> failed after ${maxAttempts} attempts (last status ${res && res.status})`);
}

/**
 * Paginate an endpoint that uses an `after` cursor + `limit`, oldest→newest.
 * Calls onBatch(batchArray) for each page. Throws if it can't reach the end
 * (so callers never publish a partial scan).
 *
 * @param {object} opts
 *   url(after)  -> full request URL for a given cursor
 *   token       -> bot token
 *   getCursor(batch) -> next `after` value (defaults to last item's user.id)
 *   limit       -> page size (natural end when batch.length < limit)
 *   maxPages    -> safety cap
 *   onBatch(batch)
 */
async function paginate({ url, token, getCursor, limit = 1000, maxPages = 1000, onBatch }) {
  let after = '0';
  for (let page = 0; page < maxPages; page++) {
    const res = await fetchWithRetry(url(after), { token });
    const batch = await res.json();
    if (!batch.length) return;            // reached the end
    onBatch(batch);
    after = getCursor ? getCursor(batch) : batch[batch.length - 1].user.id;
    if (batch.length < limit) return;     // reached the end
  }
  throw new Error(`pagination hit page cap (${maxPages}) without reaching the end`);
}

module.exports = { DISCORD_API, sleep, fetchWithRetry, paginate };
