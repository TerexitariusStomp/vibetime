import type { Env } from '../env.js';
import { shared } from '../cache.js';
import { PAGE_CSP, html, json } from '../http.js';
import { renderStats } from '../views/stats.js';
import { currentViewer, pageCacheControl, signInEnabled, themeOf, webOrigin } from '../web-session.js';

export interface StatsData {
  devs: number;
  ships: number;
  projects: number;
  crews: number;
}

// All-time totals move slowly and cost a pass over every table they count, so
// ten minutes old is fine.
export function buildStats(env: Env): Promise<StatsData> {
  return shared(env, 'stats', 600, () => computeStats(env));
}

async function computeStats(env: Env): Promise<StatsData> {
  const [shippedRes, sessionRes, crewRes] = await Promise.all([
    env.DB.prepare(
      `SELECT COUNT(DISTINCT user_github_id) AS devs,
              COALESCE(SUM(ships), 0) AS ships
       FROM ship_events`,
    ).first<{ devs: number; ships: number }>(),
    env.DB.prepare(
      `SELECT COUNT(DISTINCT user_github_id || ':' || project_hash) AS projects
       FROM sessions s
       WHERE EXISTS (SELECT 1 FROM ship_events e WHERE e.session_id = s.id)`,
    ).first<{ projects: number }>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS crews
       FROM crews c
       WHERE c.deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM crew_members m WHERE m.crew_id = c.id AND m.left_at IS NULL)`,
    ).first<{ crews: number }>().catch(() => null),
  ]);

  return {
    devs: shippedRes?.devs ?? 0,
    ships: shippedRes?.ships ?? 0,
    projects: sessionRes?.projects ?? 0,
    crews: crewRes?.crews ?? 0,
  };
}

export async function statsJson(env: Env): Promise<Response> {
  const data = await buildStats(env);
  return json({
    updatedAt: new Date().toISOString(),
    ...data,
  }, { headers: { 'cache-control': 'public, max-age=60' } });
}

export async function statsHtml(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const [data, viewer] = await Promise.all([buildStats(env), currentViewer(request, env)]);
  const nav = { viewer, signInEnabled: signInEnabled(env), path: `${url.pathname}${url.search}`, origin: webOrigin(env), theme: themeOf(request) };
  return html(renderStats(data, new Date(), nav), {
    headers: {
      ...pageCacheControl(viewer),
      'content-security-policy': PAGE_CSP,
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-content-type-options': 'nosniff',
    },
  });
}
