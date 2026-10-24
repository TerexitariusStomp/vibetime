import type { ProfileData, ProfileHeatmapDay } from '../routes/profile.js';
import { avatar, command, crewInitials, crewShade, escapeHtml, formatCount, renderBack, renderPage, type BackLink, type NavContext } from './layout.js';
import { LEGEND, heatLevel, liveDot, relativeTime } from './leaderboard.js';
import { icon } from './style.js';
import type { Membership } from '../crews.js';

function statBlock(label: string, ships: number, days: number): string {
  const dayNoun = days === 1 ? 'day' : 'days';
  return `<div class="stat"><div class="v">${formatCount(ships)}</div><div class="l">${escapeHtml(label)}</div><div class="s">${days} ${dayNoun}</div></div>`;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
function dayLabel(day: string): string {
  return `${MONTHS[Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8, 10))}`;
}

// Twelve weeks as isometric bars, one per day: weeks run from the back to the
// front, Monday to Sunday from right to left. Height follows the square root of
// the day's ships, so one huge day does not flatten the rest.
function skyline(days: ProfileHeatmapDay[], label: string): string {
  const max = Math.max(1, ...days.map((d) => d.n));
  const pt = (x: number, y: number, z: number): [number, number] => [(x - y) * 13, (x + y) * 7.4 - z];
  const bars = days.map((d, i) => ({ ...d, x: Math.floor(i / 7), y: i % 7 })).sort((p, q) => p.x + p.y - (q.x + q.y));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const parts = bars.map((b) => {
    const h = b.n ? 4 + Math.sqrt(b.n / max) * 50 : 1.5;
    const g = [pt(b.x, b.y, 0), pt(b.x + 0.74, b.y, 0), pt(b.x + 0.74, b.y + 0.74, 0), pt(b.x, b.y + 0.74, 0)];
    const t = g.map(([u, v]): [number, number] => [u, v - h]);
    for (const [u, v] of [...g, ...t]) { minX = Math.min(minX, u); maxX = Math.max(maxX, u); minY = Math.min(minY, v); maxY = Math.max(maxY, v); }
    const pts = (face: [number, number][]) => face.map(([u, v]) => `${u.toFixed(1)},${v.toFixed(1)}`).join(' ');
    return `<g class="l${heatLevel(b.n)}" style="--d:${b.x}"><title>${dayLabel(b.day)} · ${b.n} ship${b.n === 1 ? '' : 's'}</title><polygon class="a" points="${pts([g[3], g[2], t[2], t[3]])}"/><polygon class="b" points="${pts([g[1], g[2], t[2], t[1]])}"/><polygon class="t" points="${pts(t)}"/></g>`;
  });
  const box = [minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8].map((n) => n.toFixed(0)).join(' ');
  return `<svg class="sky" viewBox="${box}" role="img" aria-label="${escapeHtml(label)}">${parts.join('')}</svg>`;
}

// A shields-sized badge for READMEs. It is shown as an image on other sites, so
// it cannot read the page's tokens: the colors are fixed and readable on both
// GitHub themes. Text widths are pinned with textLength, so whichever monospace
// font the reader has, the badge measures the same.
export function renderBadge(value: string, found: boolean): string {
  const lw = Math.round(8 * 6.6);
  const rw = Math.round(value.length * 6.6);
  const left = 6 + 12 + 5 + lw + 7;
  const right = 7 + rw + 7;
  const width = left + right;
  const text = escapeHtml(value);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" viewBox="0 0 ${width} 20" role="img" aria-label="vibetime: ${text}"><title>vibetime: ${text}</title><rect width="${width}" height="20" rx="4" fill="#16141D"/><path d="M${left} 0h${right - 4}a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4h-${right - 4}z" fill="${found ? '#6D28D9' : '#6A657C'}"/><g transform="translate(6 4) scale(.1875)"><path fill="#C4B5FD" d="M32 4 4 30 28 34Z"/><path fill="#A78BFA" d="M32 4 28 34 60 30Z"/><path fill="#7C3AED" d="M4 30 32 60 28 34Z"/><path fill="#5B21B6" d="M28 34 32 60 60 30Z"/></g><g font-family="'Geist Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="11"><text x="23" y="14" textLength="${lw}" fill="#EEECF4">vibetime</text><text x="${left + 7}" y="14" textLength="${rw}" fill="#FFFFFF">${text}</text></g></svg>`;
}

export function badgeValue(ships: number, window: 'week' | 'month' | 'all'): string {
  return `${formatCount(ships)} ship${ships === 1 ? '' : 's'}${window === 'all' ? '' : ` this ${window}`}`;
}

function badgePanel(handle: string, ships: number, origin: string): string {
  const page = `${origin}/@${handle}`;
  return `<section class="panel"><div class="panel-h"><h2>add vibetime to your README</h2><span>updates every hour</span></div>
    <div class="panel-b">${renderBadge(badgeValue(ships, 'all'), true)}${command([`[![vibetime](${page}/badge.svg)](${page})`], false)}<p class="fine">add <code>?window=week</code> or <code>?window=month</code> to the badge address for that window.</p></div></section>`;
}

function profileDescription(data: ProfileData): string {
  if (data.all.ships === 0) return `@${data.handle} on vibetime. nothing shipped yet.`;
  const rank = data.weekRank != null ? `#${data.weekRank} this week. ` : '';
  return `${rank}${formatCount(data.all.ships)} ship${data.all.ships === 1 ? '' : 's'} all time, measured from git.`;
}

function skylinePanel(days: ProfileHeatmapDay[]): string {
  const shipped = days.filter((d) => d.n > 0);
  const total = shipped.reduce((sum, d) => sum + d.n, 0);
  const best = days.reduce((a, d) => (d.n > a.n ? d : a), days[0]);
  const summary = total === 0
    ? 'nothing shipped in the last 12 weeks'
    : `${formatCount(total)} ship${total === 1 ? '' : 's'} on ${shipped.length} day${shipped.length === 1 ? '' : 's'}, best day ${dayLabel(best.day)} with ${best.n}`;
  const foot = total === 0
    ? `<span>${summary}</span>`
    : `<span><b>${formatCount(total)}</b> ships · <b>${shipped.length}</b> days · best <b>${best.n}</b> on ${dayLabel(best.day)}</span>`;
  return `<section class="panel"><div class="panel-h"><h2>last 12 weeks</h2><span>${dayLabel(days[0].day)} – ${dayLabel(days[days.length - 1].day)}</span></div>
    <div class="panel-b">${skyline(days, summary)}<div class="sky-foot">${foot}${LEGEND}</div></div></section>`;
}

export function renderProfile(data: ProfileData, updatedAt: Date, nav: NavContext, crews: Membership[], back: BackLink, ranks: Map<string, number>): string {
  const crewChips = crews.length === 0 ? '' : `<div class="chips">${crews.map((c) =>
    `<a class="chip" href="/crew/${escapeHtml(c.slug)}"><span class="mono" style="background:${crewShade(c.slug)}" aria-hidden="true">${escapeHtml(crewInitials(c.name))}</span>${escapeHtml(c.name)}${ranks.has(c.slug) ? ` <span class="chip-rank">#${ranks.get(c.slug)}</span>` : ''}</a>`).join('')}</div>`;
  const handle = escapeHtml(data.handle);
  const lastLine = data.lastShippedAt
    ? `<span>${liveDot(data.lastShippedAt, updatedAt)}last shipped ${escapeHtml(relativeTime(data.lastShippedAt, updatedAt))}</span>`
    : '<span>no ships yet</span>';
  const rankLine = data.weekRank != null
    ? `<p class="rankline"><span class="pill">${icon('trophy')}#${data.weekRank} this week</span>of ${data.weekDevCount} developer${data.weekDevCount === 1 ? '' : 's'}</p>`
    : data.weekDevCount > 0
      ? `<p class="rankline">unranked this week · ${data.weekDevCount} developer${data.weekDevCount === 1 ? '' : 's'} shipping</p>`
      : '';
  const activity = data.all.ships === 0
    ? `<div class="empty"><p><b>nothing shipped. yet.</b></p></div>`
    : skylinePanel(data.days);

  return renderPage({
    title: `@${data.handle} · vibetime`,
    place: null,
    nav,
    preview: { title: `@${data.handle} on vibetime`, description: profileDescription(data) },
    body: `${renderBack(back)}
  <header class="prof">
    ${avatar(data.avatarUrl, 72)}
    <div>
      <h1>@${handle}</h1>
      <p class="meta"><a href="https://github.com/${handle}" rel="nofollow noopener">${icon('github')}github.com/${handle}</a>${lastLine}</p>
      ${rankLine}
    </div>
  </header>
  ${crewChips}
  <div class="stats">
    ${statBlock('this week', data.week.ships, data.week.days)}
    ${statBlock('this month', data.month.ships, data.month.days)}
    ${statBlock('all time', data.all.ships, data.all.days)}
  </div>
  ${activity}
  ${nav.viewer && nav.viewer.handle.toLowerCase() === data.handle.toLowerCase() ? badgePanel(data.handle, data.all.ships, nav.origin) : ''}`,
  });
}

export function renderProfileNotFound(handle: string, nav: NavContext, back: BackLink): string {
  const safe = escapeHtml(handle);
  return renderPage({
    title: `@${handle} · vibetime`,
    place: null,
    nav,
    body: `${renderBack(back)}
  <div class="notice">
    <h1>@${safe}</h1>
    <p>no vibetime profile for this handle. profiles appear after a first ship.</p>
    <div class="actions"><a class="btn" href="/leaderboard">browse the leaderboard</a></div>
  </div>`,
  });
}
