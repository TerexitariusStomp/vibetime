import type { Env } from './env.js';
import { b64url } from './jwt.js';
import { dayKey, startOfCalendarMonth, startOfCalendarWeek } from './window.js';

export const MAX_CREWS_PER_USER = 3;
export const MAX_MEMBERS = 50;
export const MIN_MEMBERS_TO_RANK = 2;
export const NAME_MIN = 2;
export const NAME_MAX = 32;
const RESERVED_SLUGS = new Set(['new', 'admin', 'api', 'crews', 'join', 'settings']);

export type CrewWindow = 'week' | 'month' | 'all';

export function parseCrewWindow(value: string | null): CrewWindow {
  return value === 'month' || value === 'all' ? value : 'week';
}

export function windowStart(window: CrewWindow): Date | null {
  return window === 'all' ? null : window === 'month' ? startOfCalendarMonth() : startOfCalendarWeek();
}

function sinceDay(window: CrewWindow): string {
  const start = windowStart(window);
  return start ? dayKey(start) : '1970-01-01';
}

// A ship counts for a crew when it landed in a week the person was a member,
// joining week and leaving week included. Weeks are whole so that joining on
// a Friday still counts your Monday, and leaving never rewrites a week that
// has already been shown. Each span walks the (user, day) index, and DISTINCT
// on the ship_events key keeps a same-week rejoin from counting a ship twice.
function countedShips(crewFilter: string): string {
  return `WITH spans AS (
    SELECT m.crew_id, m.user_github_id,
      date(m.joined_at, '-6 days', 'weekday 1') AS from_day,
      CASE WHEN m.left_at IS NULL THEN '9999-12-31' ELSE date(m.left_at, '-6 days', 'weekday 1', '+7 days') END AS to_day
    FROM crew_members m JOIN crews c ON c.id = m.crew_id
    WHERE c.deleted_at IS NULL AND ${crewFilter}
  ), counted AS (
    SELECT DISTINCT sp.crew_id, e.user_github_id, e.session_id, e.day, e.ships
    FROM spans sp JOIN ship_events e
      ON e.user_github_id = sp.user_github_id AND e.day >= sp.from_day AND e.day < sp.to_day AND e.day >= ?
  )`;
}

const LIVE_MEMBERSHIPS = `SELECT COUNT(*) FROM crew_members lm JOIN crews lc ON lc.id = lm.crew_id
  WHERE lm.user_github_id = ? AND lm.left_at IS NULL AND lc.deleted_at IS NULL`;

export interface Crew {
  id: number;
  slug: string;
  name: string;
  ownerGithubId: number;
  ownerHandle: string;
  inviteCode: string;
  open: boolean;
  createdAt: string;
  memberCount: number;
}

interface CrewRow {
  id: number;
  slug: string;
  name: string;
  owner_github_id: number;
  owner_handle: string;
  invite_code: string;
  open: number;
  created_at: string;
  member_count: number;
}

const CREW_SELECT = `SELECT c.id, c.slug, c.name, c.owner_github_id, u.handle AS owner_handle, c.invite_code, c.open, c.created_at,
  (SELECT COUNT(*) FROM crew_members m WHERE m.crew_id = c.id AND m.left_at IS NULL) AS member_count
  FROM crews c JOIN users u ON u.github_id = c.owner_github_id`;

function toCrew(r: CrewRow): Crew {
  return {
    id: r.id, slug: r.slug, name: r.name, ownerGithubId: r.owner_github_id, ownerHandle: r.owner_handle,
    inviteCode: r.invite_code, open: r.open === 1, createdAt: r.created_at, memberCount: r.member_count,
  };
}

export async function crewBySlug(env: Env, slug: string): Promise<Crew | null> {
  const r = await env.DB.prepare(`${CREW_SELECT} WHERE c.slug = ? AND c.deleted_at IS NULL`).bind(slug).first<CrewRow>();
  return r ? toCrew(r) : null;
}

export async function crewByInvite(env: Env, code: string): Promise<Crew | null> {
  const r = await env.DB.prepare(`${CREW_SELECT} WHERE c.invite_code = ? AND c.deleted_at IS NULL`).bind(code).first<CrewRow>();
  return r ? toCrew(r) : null;
}

export interface BoardEntry {
  rank: number;
  slug: string;
  name: string;
  open: boolean;
  ships: number;
  memberCount: number;
  topHandle: string | null;
}

export async function crewBoard(env: Env, window: CrewWindow): Promise<BoardEntry[]> {
  const [totals, crews] = await env.DB.batch([
    env.DB.prepare(
      `${countedShips('1 = 1')}
       SELECT crew_id, user_github_id, SUM(ships) AS ships FROM counted GROUP BY crew_id, user_github_id`,
    ).bind(sinceDay(window)),
    env.DB.prepare(
      `SELECT c.id, c.slug, c.name, c.open, c.created_at,
         (SELECT COUNT(*) FROM crew_members m WHERE m.crew_id = c.id AND m.left_at IS NULL) AS member_count
       FROM crews c WHERE c.deleted_at IS NULL`,
    ),
  ]);
  const byCrew = new Map<number, { ships: number; topUser: number | null; topShips: number }>();
  for (const r of (totals.results ?? []) as { crew_id: number; user_github_id: number; ships: number }[]) {
    const t = byCrew.get(r.crew_id) ?? { ships: 0, topUser: null, topShips: -1 };
    t.ships += r.ships;
    if (r.ships > t.topShips) { t.topShips = r.ships; t.topUser = r.user_github_id; }
    byCrew.set(r.crew_id, t);
  }
  const ranked = ((crews.results ?? []) as { id: number; slug: string; name: string; open: number; created_at: string; member_count: number }[])
    .filter((c) => c.member_count >= MIN_MEMBERS_TO_RANK)
    .map((c) => ({ ...c, ships: byCrew.get(c.id)?.ships ?? 0, topUser: byCrew.get(c.id)?.topUser ?? null }))
    .sort((a, b) => b.ships - a.ships || a.created_at.localeCompare(b.created_at))
    .slice(0, 100);
  const topIds = [...new Set(ranked.map((c) => c.topUser).filter((u): u is number => u !== null))];
  const handles = new Map<number, string>();
  if (topIds.length) {
    const res = await env.DB.prepare(`SELECT github_id, handle FROM users WHERE github_id IN (${topIds.map(() => '?').join(',')})`)
      .bind(...topIds).all<{ github_id: number; handle: string }>();
    for (const u of res.results ?? []) handles.set(u.github_id, u.handle);
  }
  return ranked.map((c, i) => ({
    rank: i + 1, slug: c.slug, name: c.name, open: c.open === 1, ships: c.ships, memberCount: c.member_count,
    topHandle: c.topUser === null ? null : handles.get(c.topUser) ?? null,
  }));
}

export interface MemberEntry {
  githubId: number;
  handle: string;
  avatarUrl: string | null;
  ships: number;
  days: number;
  lastShippedAt: string | null;
  current: boolean;
  recentDays: { day: string; n: number }[];
}

// Former members stay listed for a window they contributed to, so the rows
// always add up to the crew's number.
export async function crewMembers(env: Env, crewId: number, window: CrewWindow): Promise<MemberEntry[]> {
  const res = await env.DB.prepare(
    `${countedShips('m.crew_id = ?')},
     per_user AS (SELECT user_github_id, SUM(ships) AS ships, COUNT(DISTINCT day) AS days FROM counted GROUP BY user_github_id)
     SELECT u.github_id, u.handle, u.avatar_url,
       COALESCE(p.ships, 0) AS ships, COALESCE(p.days, 0) AS days,
       (SELECT MAX(s.ended_at) FROM ship_events e JOIN sessions s ON s.id = e.session_id WHERE e.user_github_id = u.github_id) AS last_shipped_at,
       EXISTS (SELECT 1 FROM crew_members cm WHERE cm.crew_id = ? AND cm.user_github_id = u.github_id AND cm.left_at IS NULL) AS current,
       (SELECT MIN(cm.joined_at) FROM crew_members cm WHERE cm.crew_id = ? AND cm.user_github_id = u.github_id) AS first_joined
     FROM users u LEFT JOIN per_user p ON p.user_github_id = u.github_id
     WHERE u.github_id IN (SELECT user_github_id FROM crew_members WHERE crew_id = ?)`,
  ).bind(crewId, sinceDay(window), crewId, crewId, crewId).all<{ github_id: number; handle: string; avatar_url: string | null; ships: number; days: number; last_shipped_at: string | null; current: number; first_joined: string }>();
  const rows = (res.results ?? []).filter((r) => r.current === 1 || r.ships > 0);
  rows.sort((a, b) => b.ships - a.ships || a.first_joined.localeCompare(b.first_joined));
  if (rows.length === 0) return [];

  const heatSince = dayKey(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const ids = rows.map((r) => r.github_id);
  const daily = await env.DB.prepare(
    `SELECT user_github_id, day, SUM(ships) AS n FROM ship_events
     WHERE day >= ? AND user_github_id IN (${ids.map(() => '?').join(',')}) GROUP BY user_github_id, day`,
  ).bind(heatSince, ...ids).all<{ user_github_id: number; day: string; n: number }>();
  const byUser = new Map<number, Map<string, number>>();
  for (const d of daily.results ?? []) {
    if (!byUser.has(d.user_github_id)) byUser.set(d.user_github_id, new Map());
    byUser.get(d.user_github_id)!.set(d.day, d.n);
  }
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) keys.push(dayKey(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));

  return rows.map((r) => ({
    githubId: r.github_id, handle: r.handle, avatarUrl: r.avatar_url, ships: r.ships, days: r.days,
    lastShippedAt: r.last_shipped_at, current: r.current === 1,
    recentDays: keys.map((k) => ({ day: k, n: byUser.get(r.github_id)?.get(k) ?? 0 })),
  }));
}

export interface Membership {
  slug: string;
  name: string;
}

export async function crewsOf(env: Env, githubId: number): Promise<Membership[]> {
  const res = await env.DB.prepare(
    `SELECT c.slug, c.name FROM crew_members m JOIN crews c ON c.id = m.crew_id
     WHERE m.user_github_id = ? AND m.left_at IS NULL AND c.deleted_at IS NULL ORDER BY m.joined_at`,
  ).bind(githubId).all<Membership>();
  return res.results ?? [];
}

export async function isMember(env: Env, crewId: number, githubId: number): Promise<boolean> {
  const r = await env.DB.prepare(
    `SELECT 1 AS x FROM crew_members WHERE crew_id = ? AND user_github_id = ? AND left_at IS NULL`,
  ).bind(crewId, githubId).first<{ x: number }>();
  return r !== null;
}

export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  const length = [...name].length;
  return length >= NAME_MIN && length <= NAME_MAX ? name : null;
}

export function slugFor(name: string): string {
  const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32).replace(/-+$/, '');
  if (!base || RESERVED_SLUGS.has(base)) return base ? `${base}-crew` : 'crew';
  return base;
}

function randomCode(bytes: number): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return b64url(b);
}

export type CreateResult = { ok: true; slug: string } | { ok: false; reason: 'limit' | 'name' };

export async function createCrew(env: Env, ownerId: number, rawName: unknown): Promise<CreateResult> {
  const name = cleanName(rawName);
  if (!name) return { ok: false, reason: 'name' };
  const base = slugFor(name);
  for (let attempt = 0; attempt < 4; attempt++) {
    const slug = attempt === 0 ? base : `${base.slice(0, 27)}-${randomCode(3).toLowerCase().replace(/[^a-z0-9]/g, 'x').slice(0, 4)}`;
    const now = new Date().toISOString();
    try {
      // One batch is one transaction, and the limit is checked inside the
      // insert itself, so two creates at the same instant cannot both pass it.
      const [crew] = await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO crews (slug, name, owner_github_id, invite_code, open, created_at)
           SELECT ?, ?, ?, ?, 0, ? WHERE (${LIVE_MEMBERSHIPS}) < ${MAX_CREWS_PER_USER}`,
        ).bind(slug, name, ownerId, randomCode(8), now, ownerId),
        env.DB.prepare(
          `INSERT INTO crew_members (crew_id, user_github_id, joined_at)
           SELECT id, owner_github_id, created_at FROM crews WHERE slug = ? AND deleted_at IS NULL AND owner_github_id = ? AND created_at = ?`,
        ).bind(slug, ownerId, now),
      ]);
      if ((crew.meta.changes ?? 0) === 0) return { ok: false, reason: 'limit' };
      return { ok: true, slug };
    } catch (e) {
      if (!(e instanceof Error) || !/UNIQUE/i.test(e.message)) throw e;
    }
  }
  throw new Error('could not find a free crew slug');
}

export type JoinResult = 'joined' | 'already' | 'full' | 'limit' | 'gone';

export async function joinCrew(env: Env, crewId: number, githubId: number): Promise<JoinResult> {
  const res = await env.DB.prepare(
    `INSERT INTO crew_members (crew_id, user_github_id, joined_at)
     SELECT c.id, ?2, ?3 FROM crews c
     WHERE c.id = ?1 AND c.deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM crew_members WHERE crew_id = c.id AND user_github_id = ?2 AND left_at IS NULL)
       AND (SELECT COUNT(*) FROM crew_members WHERE crew_id = c.id AND left_at IS NULL) < ${MAX_MEMBERS}
       AND (SELECT COUNT(*) FROM crew_members lm JOIN crews lc ON lc.id = lm.crew_id
            WHERE lm.user_github_id = ?2 AND lm.left_at IS NULL AND lc.deleted_at IS NULL) < ${MAX_CREWS_PER_USER}`,
  ).bind(crewId, githubId, new Date().toISOString()).run();
  if ((res.meta.changes ?? 0) > 0) return 'joined';

  const why = await env.DB.prepare(
    `SELECT c.deleted_at IS NOT NULL AS gone,
       EXISTS (SELECT 1 FROM crew_members WHERE crew_id = c.id AND user_github_id = ?2 AND left_at IS NULL) AS already,
       (SELECT COUNT(*) FROM crew_members WHERE crew_id = c.id AND left_at IS NULL) AS members
     FROM crews c WHERE c.id = ?1`,
  ).bind(crewId, githubId).first<{ gone: number; already: number; members: number }>();
  if (!why || why.gone) return 'gone';
  if (why.already) return 'already';
  if (why.members >= MAX_MEMBERS) return 'full';
  return 'limit';
}

export async function leaveCrew(env: Env, crewId: number, githubId: number): Promise<void> {
  await env.DB.prepare(
    `UPDATE crew_members SET left_at = ? WHERE crew_id = ? AND user_github_id = ? AND left_at IS NULL`,
  ).bind(new Date().toISOString(), crewId, githubId).run();
}

export async function deleteCrew(env: Env, crewId: number): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`UPDATE crews SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`).bind(now, crewId),
    env.DB.prepare(`UPDATE crew_members SET left_at = ? WHERE crew_id = ? AND left_at IS NULL`).bind(now, crewId),
  ]);
}

export async function setOpen(env: Env, crewId: number, open: boolean): Promise<void> {
  await env.DB.prepare(`UPDATE crews SET open = ? WHERE id = ?`).bind(open ? 1 : 0, crewId).run();
}

export async function renameCrew(env: Env, crewId: number, rawName: unknown): Promise<boolean> {
  const name = cleanName(rawName);
  if (!name) return false;
  await env.DB.prepare(`UPDATE crews SET name = ? WHERE id = ?`).bind(name, crewId).run();
  return true;
}

export async function resetInvite(env: Env, crewId: number): Promise<void> {
  await env.DB.prepare(`UPDATE crews SET invite_code = ? WHERE id = ?`).bind(randomCode(8), crewId).run();
}

// The new owner must still be a member at the moment of the update.
export async function handOver(env: Env, crewId: number, toGithubId: number): Promise<boolean> {
  const res = await env.DB.prepare(
    `UPDATE crews SET owner_github_id = ?1 WHERE id = ?2
     AND EXISTS (SELECT 1 FROM crew_members WHERE crew_id = ?2 AND user_github_id = ?1 AND left_at IS NULL)`,
  ).bind(toGithubId, crewId).run();
  return (res.meta.changes ?? 0) > 0;
}

export async function memberCountsOf(env: Env, githubId: number): Promise<number> {
  const r = await env.DB.prepare(LIVE_MEMBERSHIPS).bind(githubId).first<Record<string, number>>();
  return r ? Number(Object.values(r)[0]) : 0;
}
