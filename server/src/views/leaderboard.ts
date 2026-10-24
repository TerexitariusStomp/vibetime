import type { HeatmapDay, LeaderboardData, LeaderboardEntry } from '../routes/leaderboard.js';
import { avatar, command, escapeHtml, formatCount, renderPage, type NavContext } from './layout.js';
import { icon } from './style.js';

type Window = 'week' | 'month' | 'all';

export function relativeTime(iso: string, now: Date): string {
  const diffMs = now.getTime() - Date.parse(iso);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return iso.slice(0, 10);
}

// Ships a day, in five bands: 0, 1-2, 3-5, 6-11, 12+.
export function heatLevel(n: number): number {
  return n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 11 ? 3 : 4;
}

export function heatmapCells(recent: HeatmapDay[]): string {
  return recent.map(({ day, n }) => {
    const noun = n === 1 ? 'ship' : 'ships';  // heatmap intensity stays per-ship
    return `<span class="cell cell-${heatLevel(n)}" title="${escapeHtml(day)} · ${n} ${noun}"></span>`;
  }).join('');
}

// The squares with a text equivalent. A second copy on the same row (the phone
// layout shows them under the name) is hidden from screen readers.
export function heatmap(recent: HeatmapDay[], copy = false): string {
  const days = recent.filter((d) => d.n > 0).length;
  const label = copy ? 'aria-hidden="true"' : `role="img" aria-label="shipped on ${days} of the last ${recent.length} days"`;
  return `<span class="heatmap" ${label}>${heatmapCells(recent)}</span>`;
}

export const LEGEND = `<span class="legend" aria-hidden="true">less <span class="heatmap">${[0, 1, 2, 3, 4].map((l) => `<span class="cell cell-${l}"></span>`).join('')}</span> more</span>`;

// A ship from the last few minutes gets a pulse beside its time.
export function liveDot(iso: string | null, now: Date): string {
  return iso && now.getTime() - Date.parse(iso) < 15 * 60_000 ? '<i class="live" title="shipped in the last 15 minutes"></i>' : '';
}

function tab(label: string, value: Window, active: Window): string {
  const cls = value === active ? 'tab tab-active' : 'tab';
  return `<a class="${cls}" href="/leaderboard?window=${value}">${escapeHtml(label)}</a>`;
}

const SCALE_WINDOW_LABEL: Record<Window, string> = {
  week: 'this week',
  month: 'this month',
  all: 'all-time',
};

// The calendar week can straddle a month boundary (a Monday start in the old
// month), which makes "this week" occasionally show more developers than "this
// month". Spelling out the window's dates keeps that from reading as a bug.
export function windowRange(start: Date, now: Date): string {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const from = `${months[start.getUTCMonth()]} ${start.getUTCDate()}`;
  const to = start.getUTCMonth() === now.getUTCMonth()
    ? `${now.getUTCDate()}`
    : `${months[now.getUTCMonth()]} ${now.getUTCDate()}`;
  return `${from} – ${to}`;
}

// The top three stand on steps. In the markup they stay in rank order, so a
// screen reader hears 1, 2, 3; only the layout puts first in the middle.
function podium(top: LeaderboardEntry[], window: Window, viewer: string | null): string {
  return `<ol class="podium" aria-label="top three ${SCALE_WINDOW_LABEL[window]}">${top.map((e) => {
    const handle = escapeHtml(e.handle);
    const you = viewer === e.handle.toLowerCase();
    return `<li class="pod pod-${e.rank}${you ? ' you' : ''}"><a class="pod-who" href="/@${handle}">${avatar(e.avatarUrl, e.rank === 1 ? 56 : 44)}<span class="nm">${handle}</span>${you ? '<span class="tag tag-you">you</span>' : ''}</a><span class="pod-n">${formatCount(e.shippedCount)}<small> ships</small></span><span class="pod-d">on ${e.dayCount} day${e.dayCount === 1 ? '' : 's'}</span><div class="pod-block" aria-hidden="true"><span class="pod-r">${e.rank}</span></div></li>`;
  }).join('')}</ol>`;
}

export function renderLeaderboard(data: LeaderboardData, window: Window, updatedAt: Date, windowStart: Date | null, nav: NavContext): string {
  const { entries, devCount, sessionCount } = data;
  const devNoun = devCount === 1 ? 'developer' : 'developers';
  const sessionNoun = sessionCount === 1 ? 'ship' : 'ships';
  const rangeLabel = windowStart ? ` <span class="range">· ${windowRange(windowStart, updatedAt)}</span>` : '';
  const scaleLine = entries.length === 0
    ? `<p class="sub">ranked by what you ship</p>`
    : `<p class="scale"><strong>${formatCount(devCount)}</strong> ${devNoun} · <strong>${formatCount(sessionCount)}</strong> ${sessionNoun} ${escapeHtml(SCALE_WINDOW_LABEL[window])}${rangeLabel}</p>`;
  const viewer = nav.viewer ? nav.viewer.handle.toLowerCase() : null;
  const tableRows = entries.length === 0
    ? `<tr><td colspan="5"><div class="empty">
        <p><b>nothing shipped. yet.</b><br>set up vibetime and your next session counts.</p>
        ${command(['npm i -g vibetime-cli', 'vibe init', 'vibe login'])}
      </div></td></tr>`
    : entries.slice(3).map((e) => {
        const handle = escapeHtml(e.handle);
        const isViewer = viewer === e.handle.toLowerCase();
        const last = `${liveDot(e.lastShippedAt, updatedAt)}${escapeHtml(relativeTime(e.lastShippedAt, updatedAt))}`;
        return `<tr${isViewer ? ' class="you"' : ''}>
          <td class="rank">${e.rank}</td>
          <td><a class="who" href="/@${handle}">${avatar(e.avatarUrl, 28)}<span class="who-t"><span class="who-l1"><span class="nm">${handle}</span>${isViewer ? '<span class="tag tag-you">you</span>' : ''}</span><span class="meta-sm">${heatmap(e.recentDays, true)}<span>${last}</span></span></span></a></td>
          <td class="ships">${formatCount(e.shippedCount)}<small>${e.dayCount} day${e.dayCount === 1 ? '' : 's'}</small></td>
          <td class="heat hide-sm">${heatmap(e.recentDays)}</td>
          <td class="last hide-sm">${last}</td>
        </tr>`;
      }).join('');

  return renderPage({
    title: 'vibetime leaderboard',
    place: 'leaderboard',
    nav,
    preview: {
      title: 'vibetime leaderboard',
      description: `who shipped the most with AI ${SCALE_WINDOW_LABEL[window]}: ${formatCount(devCount)} ${devNoun}, ${formatCount(sessionCount)} ${sessionNoun}, measured from git.`,
    },
    body: `<header class="head">
    <div><h1>leaderboard</h1>${scaleLine}</div>
    <nav class="tabs" aria-label="window">${tab('this week', 'week', window)}${tab('this month', 'month', window)}${tab('all time', 'all', window)}</nav>
  </header>
  <a class="callout" href="/crews">${icon('users')}<span>crews: start one with your people and compete as a group</span>${icon('arrow-right', 'go')}</a>
  ${entries.length ? podium(entries.slice(0, 3), window, viewer) : ''}
  ${entries.length > 0 && entries.length <= 3 ? '' : `<table class="board">
    <thead>
      <tr>
        <th class="r">#</th>
        <th>developer</th>
        <th class="r">ships</th>
        <th class="hide-sm">last 7 days</th>
        <th class="r hide-sm">last shipped</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>`}
  <div class="board-foot"><span>updated ${updatedAt.toISOString().slice(11, 16)} utc</span>${LEGEND}</div>
  <p class="def"><b>ship</b> = each time a session lands new work worth counting: a commit, plus more than 50 lines or more than 3 files. Developers are ranked by ships. The smaller number is how many days those ships landed on, and the squares are which ones.</p>`,
  });
}
