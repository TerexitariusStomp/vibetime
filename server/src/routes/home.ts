import type { Env } from '../env.js';
import { PAGE_CSP, html } from '../http.js';
import { crewBoard } from '../crews.js';
import { renderHome } from '../views/home.js';
import { currentViewer, pageCacheControl, signInEnabled, themeOf, webOrigin } from '../web-session.js';
import { buildData } from './leaderboard.js';
import { buildStats } from './stats.js';

// The home page is what a shared vibetime.club link opens and where the logo
// goes, so it is the same page for everyone, signed in or not.
export async function homeHtml(request: Request, env: Env): Promise<Response> {
  const [stats, week, crews, viewer] = await Promise.all([
    buildStats(env),
    buildData(env, 'week'),
    // A missing crews table must not take the home page down with it.
    crewBoard(env, 'week').catch(() => []),
    currentViewer(request, env),
  ]);
  const nav = { viewer, signInEnabled: signInEnabled(env), path: '/', origin: webOrigin(env), theme: themeOf(request) };
  return html(renderHome(stats, week.entries, crews, nav), {
    headers: {
      ...pageCacheControl(viewer),
      'content-security-policy': PAGE_CSP,
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-content-type-options': 'nosniff',
    },
  });
}
