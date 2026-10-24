import type { ProfileData, ProfileHeatmapDay } from '../routes/profile.js';
import { avatar, crewInitials, crewShade, escapeHtml, formatCount, renderBack, renderPage, type BackLink, type NavContext } from './layout.js';
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
  ${activity}`,
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
