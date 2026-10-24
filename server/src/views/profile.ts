import type { ProfileData } from '../routes/profile.js';
import { avatar, crewInitials, crewShade, escapeHtml, formatCount, renderBack, renderPage, type BackLink, type NavContext } from './layout.js';
import { LEGEND, heatmap, liveDot, relativeTime } from './leaderboard.js';
import { icon } from './style.js';
import type { Membership } from '../crews.js';

function statBlock(label: string, ships: number, days: number): string {
  const dayNoun = days === 1 ? 'day' : 'days';
  return `<div class="stat"><div class="v">${formatCount(ships)}</div><div class="l">${escapeHtml(label)}</div><div class="s">${days} ${dayNoun}</div></div>`;
}

function profileDescription(data: ProfileData): string {
  if (data.all.ships === 0) return `@${data.handle} on vibetime. nothing shipped yet.`;
  const rank = data.weekRank != null ? `#${data.weekRank} this week. ` : '';
  return `${rank}${formatCount(data.all.ships)} ship${data.all.ships === 1 ? '' : 's'} all time, measured from git.`;
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
    : `<section class="panel"><div class="panel-h"><h2>last 7 days</h2>${LEGEND}</div>
    <div class="panel-b">${heatmap(data.recentDays, false, true)}</div></section>`;

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
