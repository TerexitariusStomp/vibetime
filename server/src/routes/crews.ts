import type { Env } from '../env.js';
import { PAGE_CSP, html } from '../http.js';
import {
  MAX_CREWS_PER_USER, MAX_MEMBERS, crewBoard, crewByInvite, crewBySlug, crewMembers, createCrew, crewsOf, deleteCrew,
  handOver, hasUsedCli, isMember, joinCrew, leaveCrew, memberCountsOf, parseCrewWindow, renameCrew, resetInvite, setOpen, windowStart,
  type Crew,
} from '../crews.js';
import {
  MESSAGES, renderConfirm, renderCreate, renderCrew, renderCrewBoard, renderCrewMissing, renderInvite, renderInviteGone,
} from '../views/crews.js';
import { backFrom, renderNotice, type NavContext } from '../views/layout.js';
import { currentViewer, pageCacheControl, signInEnabled, webOrigin, type Viewer } from '../web-session.js';
import { sameOrigin } from './web-auth.js';

function page(body: string, viewer: Viewer | null, status = 200, byReferer = false): Response {
  const cache = pageCacheControl(viewer);
  return html(body, {
    status,
    headers: {
      ...cache,
      ...(byReferer ? { vary: 'cookie, referer' } : {}),
      'content-security-policy': PAGE_CSP,
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-content-type-options': 'nosniff',
    },
  });
}

function see(location: string): Response {
  return new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });
}

function signInFirst(next: string): Response {
  return see(`/auth/github/start?next=${encodeURIComponent(next)}`);
}

function knownMessage(url: URL): string | null {
  const m = url.searchParams.get('m');
  return m && m in MESSAGES ? m : null;
}

async function context(request: Request, env: Env): Promise<{ url: URL; viewer: Viewer | null; nav: NavContext }> {
  const url = new URL(request.url);
  const viewer = await currentViewer(request, env);
  return { url, viewer, nav: { viewer, signInEnabled: signInEnabled(env), path: `${url.pathname}${url.search}`, origin: webOrigin(env) } };
}

async function formValue(request: Request, key: string): Promise<string | null> {
  try {
    const v = (await request.formData()).get(key);
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}

function notFound(nav: NavContext, viewer: Viewer | null): Response {
  return page(renderCrewMissing(nav), viewer, 404);
}

function forbidden(): Response {
  return html(renderNotice('not done', 'that request did not come from vibetime.club.'), { status: 403, headers: { 'cache-control': 'no-store' } });
}

export async function crewsHtml(request: Request, env: Env): Promise<Response> {
  const { url, viewer, nav } = await context(request, env);
  const window = parseCrewWindow(url.searchParams.get('window'));
  const [board, mine] = await Promise.all([crewBoard(env, window), viewer ? crewsOf(env, viewer.githubId) : Promise.resolve([])]);
  return page(renderCrewBoard(board, window, windowStart(window), new Date(), nav, new Set(mine.map((m) => m.slug))), viewer);
}

export async function newCrewHtml(request: Request, env: Env): Promise<Response> {
  const { url, viewer, nav } = await context(request, env);
  if (!viewer) return signInFirst('/crews/new');
  return page(renderCreate(nav, await memberCountsOf(env, viewer.githubId), knownMessage(url), '', new URL(webOrigin(env)).host), viewer);
}

export async function createCrewPost(request: Request, env: Env): Promise<Response> {
  if (!sameOrigin(request)) return forbidden();
  const { viewer, nav } = await context(request, env);
  if (!viewer) return signInFirst('/crews/new');
  const name = await formValue(request, 'name');
  const result = await createCrew(env, viewer.githubId, name);
  if (result.ok) return see(`/crew/${result.slug}?m=created`);
  return page(renderCreate(nav, await memberCountsOf(env, viewer.githubId), result.reason, name ?? '', new URL(webOrigin(env)).host), viewer, 200);
}

async function crewRank(env: Env, slug: string, window: ReturnType<typeof parseCrewWindow>) {
  const board = (await crewBoard(env, window)).filter((b) => b.rank !== null);
  const i = board.findIndex((b) => b.slug === slug);
  return i === -1 ? null : { rank: i + 1, above: i > 0 ? board[i - 1] : null, count: board.length };
}

export async function crewHtml(request: Request, env: Env, slug: string): Promise<Response> {
  const { url, viewer, nav } = await context(request, env);
  const crew = await crewBySlug(env, slug);
  if (!crew) return notFound(nav, viewer);
  const window = parseCrewWindow(url.searchParams.get('window'));
  const [members, rank, member] = await Promise.all([
    crewMembers(env, crew.id, window),
    crewRank(env, crew.slug, window),
    viewer ? isMember(env, crew.id, viewer.githubId) : Promise.resolve(false),
  ]);
  const me = { member, owner: member && viewer?.githubId === crew.ownerGithubId };
  const needsCli = member && viewer !== null && !(await hasUsedCli(env, viewer.githubId));
  return page(renderCrew(crew, members, window, windowStart(window), new Date(), rank, nav, me, knownMessage(url), webOrigin(env), backFrom(request, { href: '/crews', label: 'crews' }), needsCli), viewer, 200, true);
}

export async function crewJoinPost(request: Request, env: Env, slug: string): Promise<Response> {
  if (!sameOrigin(request)) return forbidden();
  const { viewer } = await context(request, env);
  if (!viewer) return signInFirst(`/crew/${slug}`);
  const crew = await crewBySlug(env, slug);
  if (!crew) return see('/crews');
  if (!crew.open) return see(`/crew/${crew.slug}?m=closedcrew`);
  const result = await joinCrew(env, crew.id, viewer.githubId);
  return see(result === 'gone' ? '/crews' : `/crew/${crew.slug}?m=${result}`);
}

type ConfirmAction = 'leave' | 'delete' | 'remove';

async function ownerOr403(env: Env, crew: Crew, viewer: Viewer): Promise<boolean> {
  return crew.ownerGithubId === viewer.githubId && await isMember(env, crew.id, viewer.githubId);
}

export async function crewConfirmHtml(request: Request, env: Env, slug: string): Promise<Response> {
  const { url, viewer, nav } = await context(request, env);
  if (!viewer) return signInFirst(`/crew/${slug}`);
  const crew = await crewBySlug(env, slug);
  if (!crew) return notFound(nav, viewer);
  const back = `/crew/${crew.slug}`;
  const action = url.searchParams.get('action') as ConfirmAction | null;
  if (!(await isMember(env, crew.id, viewer.githubId))) return see(back);
  const owner = await ownerOr403(env, crew, viewer);

  if (action === 'delete' && owner) {
    return page(renderConfirm(nav, `delete ${crew.name}?`, 'the crew page and its board go away for everyone. your ships stay on the leaderboard.', `${back}/settings`, { action: 'delete' }, 'delete crew', back), viewer);
  }
  if (action === 'leave') {
    if (owner && crew.memberCount > 1) {
      return page(renderConfirm(nav, 'hand the crew over first', 'you own this crew. give it to another member from the crew page, then you can leave.', back, {}, 'back to the crew', back).replace('btn btn-danger', 'btn'), viewer);
    }
    if (owner) {
      return page(renderConfirm(nav, `leave ${crew.name}?`, 'you are the only member, so leaving deletes the crew.', `${back}/settings`, { action: 'delete' }, 'leave and delete', back), viewer);
    }
    return page(renderConfirm(nav, `leave ${crew.name}?`, 'weeks you were in keep your ships. you can rejoin with an invite link.', `${back}/leave`, {}, 'leave crew', back), viewer);
  }
  if (action === 'remove' && owner) {
    const memberId = Number(url.searchParams.get('member'));
    const target = (await crewMembers(env, crew.id, 'week')).find((m) => m.githubId === memberId && m.current);
    if (target && memberId !== viewer.githubId) {
      return page(renderConfirm(nav, `remove ${target.handle}?`, crew.open
        ? 'weeks they were in keep their ships. this crew is open, so they can rejoin with the invite link or from the crew page. make it invite only and reset the link to keep them out.'
        : 'weeks they were in keep their ships. they can rejoin with the invite link, so reset it after removing them to keep them out.', `${back}/settings`, { action: 'remove', member: String(memberId) }, 'remove member', back), viewer);
    }
  }
  return see(back);
}

export async function crewLeavePost(request: Request, env: Env, slug: string): Promise<Response> {
  if (!sameOrigin(request)) return forbidden();
  const { viewer } = await context(request, env);
  if (!viewer) return signInFirst(`/crew/${slug}`);
  const crew = await crewBySlug(env, slug);
  if (!crew) return see('/crews');
  if (crew.ownerGithubId === viewer.githubId) return see(`/crew/${crew.slug}/confirm?action=leave`);
  await leaveCrew(env, crew.id, viewer.githubId);
  return see(`/crew/${crew.slug}?m=left`);
}

export async function crewSettingsPost(request: Request, env: Env, slug: string): Promise<Response> {
  if (!sameOrigin(request)) return forbidden();
  const { viewer } = await context(request, env);
  if (!viewer) return signInFirst(`/crew/${slug}`);
  const crew = await crewBySlug(env, slug);
  if (!crew) return see('/crews');
  const back = `/crew/${crew.slug}`;
  if (!(await ownerOr403(env, crew, viewer))) return see(back);

  let form: FormData;
  try { form = await request.formData(); } catch { return see(back); }
  const action = form.get('action');
  switch (action) {
    case 'open':
    case 'close':
      await setOpen(env, crew.id, action === 'open');
      return see(`${back}?m=${action === 'open' ? 'opened' : 'closed'}`);
    case 'rename':
      return see(`${back}?m=${(await renameCrew(env, crew.id, form.get('name'))) ? 'renamed' : 'name'}`);
    case 'reset':
      await resetInvite(env, crew.id);
      return see(`${back}?m=reset`);
    case 'handover': {
      const to = Number(form.get('member'));
      if (!Number.isInteger(to) || to === viewer.githubId) return see(back);
      return see((await handOver(env, crew.id, to)) ? `${back}?m=handed` : back);
    }
    case 'remove': {
      const who = Number(form.get('member'));
      if (!Number.isInteger(who) || who === viewer.githubId) return see(back);
      await leaveCrew(env, crew.id, who);
      return see(`${back}?m=removed`);
    }
    case 'delete':
      await deleteCrew(env, crew.id);
      return see('/crews');
    default:
      return see(back);
  }
}

async function inviteState(env: Env, crew: Crew, viewer: Viewer | null): Promise<'signed-out' | 'can-join' | 'limit' | 'full' | 'member'> {
  if (!viewer) return 'signed-out';
  if (await isMember(env, crew.id, viewer.githubId)) return 'member';
  if (crew.memberCount >= MAX_MEMBERS) return 'full';
  if ((await memberCountsOf(env, viewer.githubId)) >= MAX_CREWS_PER_USER) return 'limit';
  return 'can-join';
}

export async function inviteHtml(request: Request, env: Env, code: string): Promise<Response> {
  const { viewer, nav } = await context(request, env);
  const crew = await crewByInvite(env, code);
  if (!crew) return page(renderInviteGone(nav), viewer, 404);
  const state = await inviteState(env, crew, viewer);
  if (state === 'member') return see(`/crew/${crew.slug}?m=already`);
  const [members, fullBoard] = await Promise.all([crewMembers(env, crew.id, 'week'), crewBoard(env, 'week')]);
  const board = fullBoard.filter((b) => b.rank !== null);
  const i = board.findIndex((b) => b.slug === crew.slug);
  const avatars = members.filter((m) => m.current).slice(0, 8).map((m) => m.avatarUrl);
  const [inCrews, usedCli] = viewer
    ? await Promise.all([memberCountsOf(env, viewer.githubId), hasUsedCli(env, viewer.githubId)])
    : [0, true];
  return page(renderInvite(crew, members.reduce((a, m) => a + m.ships, 0), i === -1 ? null : i + 1, board.length, avatars, nav, state, code, inCrews, !usedCli), viewer);
}

export async function invitePost(request: Request, env: Env, code: string): Promise<Response> {
  if (!sameOrigin(request)) return forbidden();
  const { viewer } = await context(request, env);
  if (!viewer) return signInFirst(`/join/${code}`);
  const crew = await crewByInvite(env, code);
  if (!crew) return see(`/join/${code}`);
  const result = await joinCrew(env, crew.id, viewer.githubId);
  if (result === 'gone') return see(`/join/${code}`);
  if (result === 'full' || result === 'limit') return see(`/join/${code}`);
  return see(`/crew/${crew.slug}?m=${result}`);
}

export function parseCrewPath(pathname: string): { slug: string; rest: string } | null {
  const m = /^\/crew\/([A-Za-z0-9][A-Za-z0-9-]{0,39})(\/[a-z]+)?\/?$/.exec(pathname);
  return m ? { slug: m[1], rest: m[2] ?? '' } : null;
}

// Slugs are lowercase, but people retype links from a crew name they saw.
export function lowercaseCrewRedirect(slug: string, rest: string, search: string): Response | null {
  if (slug === slug.toLowerCase()) return null;
  return new Response(null, { status: 301, headers: { location: `/crew/${slug.toLowerCase()}${rest}${search}` } });
}

export function parseInvitePath(pathname: string): string | null {
  const m = /^\/join\/([A-Za-z0-9_-]{6,20})\/?$/.exec(pathname);
  return m ? m[1] : null;
}
