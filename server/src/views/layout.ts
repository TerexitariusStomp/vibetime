import type { Viewer } from '../web-session.js';

// A crew keeps the same shade everywhere it appears, so it reads as one thing
// across the board, its page, the invite and a profile.
const CREW_SHADES = ['#a78bfa', '#c4b5fd', '#8b5cf6', '#d8b4fe', '#7c3aed', '#e9d5ff', '#9f7aea', '#b794f4'];
export function crewShade(slug: string): string {
  let n = 0;
  for (const c of slug) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return CREW_SHADES[n % CREW_SHADES.length];
}

export function crewInitials(name: string): string {
  return name.split(/\s+/).map((w) => [...w][0] ?? '').join('').slice(0, 2).toUpperCase();
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

export type NavPlace = 'leaderboard' | 'crews' | 'stats' | null;

export interface NavContext {
  viewer: Viewer | null;
  signInEnabled: boolean;
  // Where sign-in and sign-out return to: the page the bar is on.
  path: string;
  // Link previews only resolve absolute URLs.
  origin: string;
}

export function renderMeta(nav: NavContext, title: string, description: string): string {
  const url = `${nav.origin}${nav.path.split('?')[0]}`;
  const tags: [string, string, string][] = [
    ['name', 'description', description],
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', 'vibetime'],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:url', url],
    ['property', 'og:image', `${nav.origin}/og.png`],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['property', 'og:image:alt', 'vibetime: track what you actually ship with AI.'],
    ['name', 'twitter:card', 'summary_large_image'],
  ];
  return tags.map(([k, n, v]) => `<meta ${k}="${n}" content="${escapeHtml(v)}">`).join('\n');
}

export interface BackLink {
  href: string;
  label: string;
}

// Pages people reach by clicking through get a way back to where they were.
// Only this site's own pages count; anything else falls back to the fallback.
export function backFrom(request: Request, fallback: BackLink): BackLink {
  const referer = request.headers.get('referer');
  if (!referer) return fallback;
  let from: URL;
  try { from = new URL(referer); } catch { return fallback; }
  const here = new URL(request.url);
  if (from.origin !== here.origin || from.pathname === here.pathname) return fallback;
  const href = `${from.pathname}${from.search}`;
  if (!/^[\x21-\x7e]+$/.test(href) || href.length > 300) return fallback;
  if (from.pathname === '/leaderboard') return { href, label: 'leaderboard' };
  if (from.pathname === '/crews') return { href, label: 'crews' };
  if (from.pathname === '/stats') return { href, label: 'stats' };
  if (/^\/crew\/[a-z0-9-]+$/.test(from.pathname)) return { href, label: 'back to the crew' };
  const handle = /^\/@([A-Za-z0-9-]+)$/.exec(from.pathname);
  if (handle) return { href, label: `@${handle[1]}` };
  return fallback;
}

export const BACK_STYLE = `
  .back { color: #666; font-size: 12px; display: inline-block; margin: -8px 0 20px; text-decoration: none; }
  .back:hover { color: #a78bfa; }
`;

export function renderBack(back: BackLink): string {
  return `<a class="back" href="${escapeHtml(back.href)}">← ${escapeHtml(back.label)}</a>`;
}

export const NAV_STYLE = `
  .nav { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid #1a1a1a; }
  .nav .brand { color: #a78bfa; font-weight: 600; letter-spacing: 0.5px; white-space: nowrap; text-decoration: none; }
  .nav .brand:hover { color: #c4b5fd; }
  .nav .places { display: flex; gap: 2px; flex: 1; min-width: 0; }
  .nav .places a { color: #666; padding: 4px 10px; border-radius: 6px; font-size: 13px; text-decoration: none; }
  .nav .places a:hover { color: #a78bfa; }
  .nav .places a.on { color: #e5e5e5; background: #15101f; }
  .nav .account { display: flex; align-items: center; gap: 10px; font-size: 12px; flex-shrink: 0; }
  .nav .me { display: flex; align-items: center; gap: 8px; color: #888; text-decoration: none; min-width: 0; }
  .nav .me:hover { color: #a78bfa; }
  .nav .me img, .nav .me .avatar-fallback { width: 22px; height: 22px; border-radius: 50%; display: block; }
  .nav .me .avatar-fallback { background: #1a1a1a; }
  .nav .me span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 14ch; }
  .nav form { margin: 0; }
  .nav .signout { background: none; border: 0; padding: 0; color: #555; font: inherit; font-size: 12px; cursor: pointer; }
  .nav .signout:hover { color: #a78bfa; }
  .nav .signin { color: #e5e5e5; border: 1px solid #1a1a1a; padding: 4px 10px; border-radius: 6px; font-size: 12px; text-decoration: none; white-space: nowrap; }
  .nav .signin:hover { border-color: #a78bfa; color: #a78bfa; }
  @media (max-width: 480px) {
    .nav { gap: 10px; }
    .nav .places a { padding: 4px 6px; }
    .nav .me span { display: none; }
  }
  @media (max-width: 420px) {
    .nav .brand-word { display: none; }
  }
  @media (max-width: 360px) {
    .nav { gap: 8px; }
    .nav .places a { padding: 4px 3px; font-size: 12px; }
    .nav .account { gap: 8px; }
  }
`;

export function renderNav(place: NavPlace, ctx: NavContext): string {
  const place_ = (label: string, href: string, key: NavPlace): string =>
    `<a href="${href}"${place === key ? ' class="on" aria-current="page"' : ''}>${label}</a>`;
  let account = '';
  if (ctx.viewer) {
    const handle = escapeHtml(ctx.viewer.handle);
    const avatar = ctx.viewer.avatarUrl
      ? `<img src="${escapeHtml(ctx.viewer.avatarUrl)}" alt="" width="22" height="22">`
      : `<span class="avatar-fallback" aria-hidden="true"></span>`;
    account = `<div class="account">
      <a class="me" href="/@${handle}" title="your profile">${avatar}<span>${handle}</span></a>
      <form method="post" action="/auth/signout"><input type="hidden" name="next" value="${escapeHtml(ctx.path)}"><button class="signout" type="submit">sign out</button></form>
    </div>`;
  } else if (ctx.signInEnabled) {
    account = `<a class="signin" href="/auth/github/start?next=${encodeURIComponent(ctx.path)}">sign in</a>`;
  }
  return `<nav class="nav" aria-label="vibetime">
    <a class="brand" href="/leaderboard" aria-label="vibetime">◆<span class="brand-word"> vibetime</span></a>
    <div class="places">${place_('leaderboard', '/leaderboard', 'leaderboard')}${place_('crews', '/crews', 'crews')}${place_('stats', '/stats', 'stats')}</div>
    ${account}
  </nav>`;
}

export function renderNotice(title: string, body: string, action?: { href: string; label: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · vibetime</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #0a0a0a; color: #e5e5e5; padding: 32px 16px; }
  main { max-width: 560px; margin: 0 auto; }
  h1 { font-size: 18px; color: #a78bfa; margin: 40px 0 8px; font-weight: 600; }
  p { color: #888; font-size: 13px; margin: 0 0 20px; }
  a { color: #a78bfa; text-decoration: none; }
  a:hover { color: #c4b5fd; }
  .actions { display: flex; gap: 16px; font-size: 13px; }
  ${NAV_STYLE}
</style>
</head>
<body>
<main>
  ${renderNav(null, { viewer: null, signInEnabled: false, path: '/leaderboard', origin: '' })}
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(body)}</p>
  <div class="actions">${action ? `<a href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>` : ''}<a href="/leaderboard">back to the leaderboard</a></div>
</main>
</body>
</html>`;
}
