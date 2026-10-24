import type { Env } from '../env.js';
import { PAGE_CSP, html } from '../http.js';
import { crewBoard } from '../crews.js';
import { renderHome } from '../views/home.js';
import { SESSION_COOKIE, cookie, readCookie, signInEnabled, themeOf, webOrigin } from '../web-session.js';
import { buildData } from './leaderboard.js';
import { buildStats } from './stats.js';

// The home page is for a first visit. vt_seen holds when it was first shown;
// within that visit (a reload, a theme switch) / still shows it, and on any
// later visit, or once signed in, / goes straight to the leaderboard.
const SEEN_COOKIE = 'vt_seen';
const VISIT_MS = 30 * 60 * 1000;

export async function homeHtml(request: Request, env: Env): Promise<Response> {
  const now = Date.now();
  const seen = Number(readCookie(request, SEEN_COOKIE)) || 0;
  if (readCookie(request, SESSION_COOKIE) || (seen > 0 && now - seen > VISIT_MS)) {
    return new Response(null, { status: 302, headers: { location: '/leaderboard', 'cache-control': 'no-store', vary: 'cookie' } });
  }
  const [stats, week, crews] = await Promise.all([
    buildStats(env),
    buildData(env, 'week'),
    // A missing crews table must not take the home page down with it.
    crewBoard(env, 'week').catch(() => []),
  ]);
  const nav = { viewer: null, signInEnabled: signInEnabled(env), path: '/', origin: webOrigin(env), theme: themeOf(request) };
  const headers: Record<string, string> = {
    'cache-control': 'no-store',
    'content-security-policy': PAGE_CSP,
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-content-type-options': 'nosniff',
  };
  if (!seen) headers['set-cookie'] = cookie(SEEN_COOKIE, String(now), 365 * 24 * 60 * 60);
  return html(renderHome(stats, week.entries, crews, nav), { headers });
}
