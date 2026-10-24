import type { Env } from '../env.js';
import { PAGE_CSP, html } from '../http.js';
import { currentViewer, pageCacheControl, signInEnabled, themeOf, webOrigin } from '../web-session.js';
import { backFrom } from '../views/layout.js';
import { renderProfile, renderProfileNotFound } from '../views/profile.js';
import { crewBoard, crewsOf } from '../crews.js';
import { dayKey, startOfCalendarMonth, startOfCalendarWeek } from '../window.js';

// The skyline: this week and the eleven before it, Monday first.
const SKYLINE_WEEKS = 12;

export interface ProfileWindowStats {
  ships: number;
  days: number;
}

export interface ProfileHeatmapDay {
  day: string;
  n: number;
}

export interface ProfileData {
  githubId: number;
  handle: string;
  avatarUrl: string | null;
  week: ProfileWindowStats;
  month: ProfileWindowStats;
  all: ProfileWindowStats;
  lastShippedAt: string | null;
  weekRank: number | null;
  weekDevCount: number;
  // Ships per day from the Monday eleven weeks back through today.
  days: ProfileHeatmapDay[];
}

// GitHub login rules: 1–39 chars, alphanumeric or hyphen, no leading/trailing hyphen.
export function parseProfileHandle(pathname: string): string | null {
  if (!pathname.startsWith('/@')) return null;
  const raw = pathname.slice(2);
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(raw)) return null;
  return raw;
}

async function windowStats(
  env: Env,
  githubId: number,
  sinceDay: string,
): Promise<ProfileWindowStats> {
  const row = await env.DB.prepare(
    `SELECT COALESCE(SUM(ships), 0) AS ships, COUNT(DISTINCT day) AS days
     FROM ship_events
     WHERE user_github_id = ? AND day >= ?`,
  ).bind(githubId, sinceDay).first<{ ships: number; days: number }>();
  return { ships: row?.ships ?? 0, days: row?.days ?? 0 };
}

async function weekRank(
  env: Env,
  githubId: number,
  sinceDay: string,
  weekShips: number,
): Promise<{ rank: number | null; devCount: number }> {
  const totals = await env.DB.prepare(
    `SELECT COUNT(DISTINCT user_github_id) AS dev_count
     FROM ship_events
     WHERE day >= ?`,
  ).bind(sinceDay).first<{ dev_count: number }>();
  const devCount = totals?.dev_count ?? 0;
  if (weekShips <= 0 || devCount === 0) return { rank: null, devCount };

  // Same ordering as the leaderboard: more ships first, earlier first ship breaks ties.
  const ahead = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM (
       SELECT e.user_github_id,
              SUM(e.ships) AS shipped_count,
              MIN(s.started_at) AS first_at
       FROM ship_events e
       JOIN sessions s ON s.id = e.session_id
       WHERE e.day >= ?
       GROUP BY e.user_github_id
       HAVING shipped_count > ?
          OR (shipped_count = ? AND first_at < (
                SELECT MIN(s2.started_at)
                FROM ship_events e2
                JOIN sessions s2 ON s2.id = e2.session_id
                WHERE e2.user_github_id = ? AND e2.day >= ?
              ))
     )`,
  ).bind(sinceDay, weekShips, weekShips, githubId, sinceDay).first<{ n: number }>();

  return { rank: (ahead?.n ?? 0) + 1, devCount };
}

async function buildProfile(env: Env, handle: string): Promise<ProfileData | null> {
  const user = await env.DB.prepare(
    `SELECT github_id, handle, avatar_url
     FROM users
     WHERE handle = ? COLLATE NOCASE`,
  ).bind(handle).first<{ github_id: number; handle: string; avatar_url: string | null }>();
  if (!user) return null;

  const weekStart = dayKey(startOfCalendarWeek());
  const monthStart = dayKey(startOfCalendarMonth());
  const allStart = '1970-01-01';

  const [week, month, all] = await Promise.all([
    windowStats(env, user.github_id, weekStart),
    windowStats(env, user.github_id, monthStart),
    windowStats(env, user.github_id, allStart),
  ]);

  const last = await env.DB.prepare(
    `SELECT MAX(s.ended_at) AS last_shipped_at
     FROM ship_events e
     JOIN sessions s ON s.id = e.session_id
     WHERE e.user_github_id = ?`,
  ).bind(user.github_id).first<{ last_shipped_at: string | null }>();

  const { rank, devCount } = await weekRank(env, user.github_id, weekStart, week.ships);

  const since = startOfCalendarWeek();
  since.setUTCDate(since.getUTCDate() - 7 * (SKYLINE_WEEKS - 1));
  const dailyRes = await env.DB.prepare(
    `SELECT day, SUM(ships) AS n
     FROM ship_events
     WHERE user_github_id = ? AND day >= ?
     GROUP BY day`,
  ).bind(user.github_id, dayKey(since)).all<{ day: string; n: number }>();

  const byDay = new Map((dailyRes.results ?? []).map((d) => [d.day, d.n]));
  const days: ProfileHeatmapDay[] = [];
  const today = dayKey(new Date());
  for (const d = since; dayKey(d) <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = dayKey(d);
    days.push({ day: key, n: byDay.get(key) ?? 0 });
  }

  return {
    githubId: user.github_id,
    handle: user.handle,
    avatarUrl: user.avatar_url,
    week,
    month,
    all,
    lastShippedAt: last?.last_shipped_at ?? null,
    weekRank: rank,
    weekDevCount: devCount,
    days,
  };
}

const PAGE_HEADERS = {
  'content-security-policy': PAGE_CSP,
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-content-type-options': 'nosniff',
} as const;

export async function profileHtml(request: Request, env: Env, handle: string): Promise<Response> {
  const [data, viewer] = await Promise.all([buildProfile(env, handle), currentViewer(request, env)]);
  const nav = { viewer, signInEnabled: signInEnabled(env), path: new URL(request.url).pathname, origin: webOrigin(env), theme: themeOf(request) };
  const headers = { ...PAGE_HEADERS, ...pageCacheControl(viewer), 'vary': 'cookie, referer' };
  const back = backFrom(request, { href: '/leaderboard', label: 'leaderboard' });
  if (!data) {
    return html(renderProfileNotFound(handle, nav, back), { status: 404, headers });
  }
  // A missing crews table must not take the profile down with it.
  const crews = await crewsOf(env, data.githubId).catch(() => []);
  const ranks = new Map<string, number>();
  if (crews.length) {
    const board = await crewBoard(env, 'week').catch(() => []);
    for (const b of board) if (b.rank !== null) ranks.set(b.slug, b.rank);
  }
  return html(renderProfile(data, new Date(), nav, crews, back, ranks), { headers });
}
