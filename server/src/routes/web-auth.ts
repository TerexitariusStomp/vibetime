import type { Env } from '../env.js';
import { html } from '../http.js';
import { b64url } from '../jwt.js';
import { sha256Hex, upsertGithubUser } from './auth.js';
import { renderNotice } from '../views/layout.js';
import {
  SESSION_COOKIE, SESSION_TTL_MS, cookie, readCookie, safeNext, signInEnabled, webOrigin,
} from '../web-session.js';

const STATE_COOKIE = 'vt_oauth';
const STATE_PATH = '/auth/github';
const STATE_TTL_SECONDS = 600;

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

function redirect(location: string, cookies: string[] = [], status = 302): Response {
  const headers = new Headers({ location, 'cache-control': 'no-store' });
  for (const c of cookies) headers.append('set-cookie', c);
  return new Response(null, { status, headers });
}

function notice(status: number, title: string, body: string, retryNext?: string): Response {
  const action = retryNext === undefined ? undefined
    : { href: `/auth/github/start?next=${encodeURIComponent(retryNext)}`, label: 'try again' };
  return html(renderNotice(title, body, action), {
    status,
    headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  });
}

export async function githubStart(request: Request, env: Env): Promise<Response> {
  if (!signInEnabled(env)) return notice(404, 'sign-in is not available', 'signing in on the site is not switched on yet.');
  const url = new URL(request.url);
  const origin = webOrigin(env);
  if (url.origin !== origin) return redirect(`${origin}${url.pathname}${url.search}`);

  const next = safeNext(url.searchParams.get('next'));
  const state = randomToken();
  const authorize = new URL(`${env.GITHUB_WEB_BASE ?? 'https://github.com'}/login/oauth/authorize`);
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', `${origin}/auth/github/callback`);
  authorize.searchParams.set('state', state);
  // No scope: the public profile is all a sign-in needs.
  return redirect(authorize.toString(), [
    cookie(STATE_COOKIE, `${state}.${encodeURIComponent(next)}`, STATE_TTL_SECONDS, STATE_PATH),
  ]);
}

export async function githubCallback(request: Request, env: Env): Promise<Response> {
  if (!signInEnabled(env)) return notice(404, 'sign-in is not available', 'signing in on the site is not switched on yet.');
  const url = new URL(request.url);
  const clearState = cookie(STATE_COOKIE, '', 0, STATE_PATH);

  const saved = readCookie(request, STATE_COOKIE) ?? '';
  const dot = saved.indexOf('.');
  const savedState = dot === -1 ? '' : saved.slice(0, dot);
  let next = '/leaderboard';
  try { next = safeNext(decodeURIComponent(saved.slice(dot + 1))); } catch { /* keep the default */ }

  const state = url.searchParams.get('state');
  if (!savedState || !state || state !== savedState) {
    return notice(400, 'sign-in expired', 'this sign-in link is old or was opened in another browser.', next);
  }
  // Pressing cancel on GitHub is a choice, not an error: go back where they were.
  if (url.searchParams.get('error')) return redirect(next, [clearState]);
  const code = url.searchParams.get('code');
  if (!code) return notice(400, 'sign-in did not finish', 'GitHub sent no confirmation back.', next);

  let accessToken: string | undefined;
  try {
    const tokenRes = await fetch(`${env.GITHUB_WEB_BASE ?? 'https://github.com'}/login/oauth/access_token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'accept': 'application/json', 'user-agent': 'vibetime-api' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${webOrigin(env)}/auth/github/callback`,
      }),
    });
    const body = (await tokenRes.json()) as { access_token?: unknown };
    if (typeof body.access_token === 'string') accessToken = body.access_token;
  } catch (e) {
    console.error('github token exchange failed:', e instanceof Error ? e.message : e);
  }
  if (!accessToken) return notice(502, 'sign-in did not finish', 'GitHub did not confirm the sign-in.', next);

  let gh: { id?: unknown; login?: unknown; avatar_url?: unknown } = {};
  try {
    const userRes = await fetch(`${env.GITHUB_API_BASE ?? 'https://api.github.com'}/user`, {
      headers: { 'authorization': `Bearer ${accessToken}`, 'user-agent': 'vibetime-api', 'accept': 'application/vnd.github+json' },
    });
    if (userRes.ok) gh = (await userRes.json()) as typeof gh;
  } catch (e) {
    console.error('github user lookup failed:', e instanceof Error ? e.message : e);
  }
  if (typeof gh.id !== 'number' || typeof gh.login !== 'string') {
    return notice(502, 'sign-in did not finish', 'GitHub did not say who you are.', next);
  }

  const token = randomToken();
  const now = Date.now();
  try {
    await upsertGithubUser(env, { id: gh.id, login: gh.login, avatar_url: gh.avatar_url });
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM web_sessions WHERE expires_at <= ?`).bind(new Date(now).toISOString()),
      env.DB.prepare(
        `INSERT INTO web_sessions (token_hash, user_github_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
      ).bind(await sha256Hex(token), gh.id, new Date(now).toISOString(), new Date(now + SESSION_TTL_MS).toISOString()),
    ]);
  } catch (e) {
    console.error('web session write failed:', e instanceof Error ? e.message : e);
    return notice(503, 'sign-in did not finish', 'vibetime could not save the sign-in.', next);
  }
  return redirect(next, [clearState, cookie(SESSION_COOKIE, token, SESSION_TTL_MS / 1000)]);
}

// A cross-site form could otherwise sign people out of the site.
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (origin) return origin === new URL(request.url).origin;
  return request.headers.get('sec-fetch-site') === 'same-origin';
}

export async function signOut(request: Request, env: Env): Promise<Response> {
  if (!sameOrigin(request)) return notice(403, 'not signed out', 'that sign-out request did not come from vibetime.club.');
  let next = '/leaderboard';
  try {
    const form = await request.formData();
    const value = form.get('next');
    next = safeNext(typeof value === 'string' ? value : null);
  } catch { /* keep the default */ }
  const token = readCookie(request, SESSION_COOKIE);
  if (token) {
    try {
      await env.DB.prepare(`DELETE FROM web_sessions WHERE token_hash = ?`).bind(await sha256Hex(token)).run();
    } catch (e) {
      console.error('web session delete failed:', e instanceof Error ? e.message : e);
      return notice(503, 'not signed out', 'vibetime could not end the session. try again in a moment.');
    }
  }
  return redirect(next, [cookie(SESSION_COOKIE, '', 0)], 303);
}
