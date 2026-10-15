import type { Env } from './env.js';
import { sha256Hex } from './routes/auth.js';

export const SESSION_COOKIE = 'vt_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface Viewer {
  githubId: number;
  handle: string;
  avatarUrl: string | null;
}

export function signInEnabled(env: Env): boolean {
  return typeof env.GITHUB_CLIENT_SECRET === 'string' && env.GITHUB_CLIENT_SECRET.length > 0;
}

export function webOrigin(env: Env): string {
  return (env.WEB_ORIGIN ?? 'https://vibetime.club').replace(/\/+$/, '');
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

export function cookie(name: string, value: string, maxAgeSeconds: number, path = '/'): string {
  return `${name}=${value}; Max-Age=${maxAgeSeconds}; Path=${path}; HttpOnly; Secure; SameSite=Lax`;
}

// Only a path on this site, so the sign-in round trip can never be turned into
// a redirect to somewhere else.
export function safeNext(value: string | null | undefined): string {
  if (!value || value.length > 300) return '/leaderboard';
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/leaderboard';
  // Every path on this site is ASCII, and a Location header carries bytes, so
  // anything else would arrive garbled.
  if (!/^[\x21-\x7e]+$/.test(value)) return '/leaderboard';
  return value;
}

// A broken or unknown cookie reads as signed out. Pages must render for
// everyone, so nothing here may throw past the caller.
export async function currentViewer(request: Request, env: Env): Promise<Viewer | null> {
  if (!signInEnabled(env)) return null;
  const token = readCookie(request, SESSION_COOKIE);
  if (!token || token.length < 32 || token.length > 128) return null;
  try {
    const row = await env.DB.prepare(
      `SELECT u.github_id, u.handle, u.avatar_url
       FROM web_sessions ws JOIN users u ON u.github_id = ws.user_github_id
       WHERE ws.token_hash = ? AND ws.expires_at > ?`,
    ).bind(await sha256Hex(token), new Date().toISOString())
      .first<{ github_id: number; handle: string; avatar_url: string | null }>();
    return row ? { githubId: row.github_id, handle: row.handle, avatarUrl: row.avatar_url } : null;
  } catch (e) {
    console.error('viewer lookup failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

// Pages carry the viewer's name in the top bar, so a signed-in copy must never
// be served to anyone else from a cache.
export function pageCacheControl(viewer: Viewer | null): Record<string, string> {
  return viewer
    ? { 'cache-control': 'private, no-store', 'vary': 'cookie' }
    : { 'cache-control': 'public, max-age=60', 'vary': 'cookie' };
}
