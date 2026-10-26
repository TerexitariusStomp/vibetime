import type { Env } from './env.js';
import { webOrigin } from './web-session.js';

// A failed recompute serves the last good copy for this long. A board from
// this morning is better than a 500, which is what a D1 limit used to cause.
const KEEP_SECONDS = 24 * 60 * 60;

interface Entry<T> {
  at: number;
  value: T;
}

// Numbers every visitor sees alike are kept in this colo's cache, so a page
// reads D1 at most once per `freshSeconds` however often it is viewed. Callers
// put the window's start in `key`, so a new week never shows last week's copy.
function cacheUrl(env: Env, key: string): string {
  return `${webOrigin(env)}/__shared/${encodeURIComponent(key)}`;
}

export async function shared<T>(env: Env, key: string, freshSeconds: number, compute: () => Promise<T>): Promise<T> {
  const cacheKey = cacheUrl(env, key);
  let stale: Entry<T> | null = null;
  try {
    const hit = await caches.default.match(cacheKey);
    if (hit) stale = await hit.json<Entry<T>>();
  } catch (e) {
    console.error('shared cache read failed:', key, e instanceof Error ? e.message : e);
  }
  if (stale && Date.now() - stale.at < freshSeconds * 1000) return stale.value;

  let value: T;
  try {
    value = await compute();
  } catch (e) {
    if (!stale) throw e;
    console.error('serving stale', key, 'after:', e instanceof Error ? e.message : e);
    return stale.value;
  }
  try {
    const entry: Entry<T> = { at: Date.now(), value };
    await caches.default.put(cacheKey, new Response(JSON.stringify(entry), {
      headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${KEEP_SECONDS}` },
    }));
  } catch (e) {
    console.error('shared cache write failed:', key, e instanceof Error ? e.message : e);
  }
  return value;
}

// The cache is per colo, and so is the person who just changed something: the
// request that writes runs in the colo they will read from next, so dropping
// the copy there is enough for them to see their change at once.
export async function forget(env: Env, keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => caches.default.delete(cacheUrl(env, key)).catch((e: unknown) => {
    console.error('shared cache delete failed:', key, e instanceof Error ? e.message : e);
  })));
}
