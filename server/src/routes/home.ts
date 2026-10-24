import type { Env } from '../env.js';
import { PAGE_CSP, html } from '../http.js';
import { crewBoard } from '../crews.js';
import { renderHome } from '../views/home.js';
import { SESSION_COOKIE, pageCacheControl, readCookie, signInEnabled, themeOf, webOrigin } from '../web-session.js';
import { buildData } from './leaderboard.js';
import { buildStats } from './stats.js';

// The home page is what a shared vibetime.club link opens, so it is always there
// for anyone signed out. People who are signed in already know what it is and go
// straight to the leaderboard.
export async function homeHtml(request: Request, env: Env): Promise<Response> {
  if (readCookie(request, SESSION_COOKIE)) {
    return new Response(null, { status: 302, headers: { location: '/leaderboard', 'cache-control': 'no-store', vary: 'cookie' } });
  }
  const [stats, week, crews] = await Promise.all([
    buildStats(env),
    buildData(env, 'week'),
    // A missing crews table must not take the home page down with it.
    crewBoard(env, 'week').catch(() => []),
  ]);
  const nav = { viewer: null, signInEnabled: signInEnabled(env), path: '/', origin: webOrigin(env), theme: themeOf(request) };
  return html(renderHome(stats, week.entries, crews, nav), {
    headers: {
      ...pageCacheControl(null),
      'content-security-policy': PAGE_CSP,
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-content-type-options': 'nosniff',
    },
  });
}
