import type { BoardEntry, Crew, CrewWindow, Face, MemberEntry } from '../crews.js';
import { MAX_CREWS_PER_USER, MAX_MEMBERS, MIN_MEMBERS_TO_RANK, NAME_MAX, slugFor } from '../crews.js';
import { BACK_STYLE, NAV_STYLE, crewInitials, crewShade, escapeHtml, renderBack, renderNav, type BackLink, type NavContext, type NavPlace } from './layout.js';
import { heatmapCells, relativeTime, windowRange } from './leaderboard.js';

const WINDOW_LABEL: Record<CrewWindow, string> = { week: 'this week', month: 'this month', all: 'all time' };

// Messages arrive as ?m= after a form post, so a refresh never repeats the action.
export const MESSAGES: Record<string, { text: string; good: boolean }> = {
  created: { text: 'crew started. send the invite link to your people.', good: true },
  joined: { text: 'you joined. your ships this week count here too.', good: true },
  left: { text: 'you left the crew. weeks you were in keep your ships.', good: true },
  opened: { text: 'the crew is open: anyone can join from this page.', good: true },
  closed: { text: 'the crew is invite only: people need the link to join.', good: true },
  renamed: { text: 'crew renamed.', good: true },
  reset: { text: 'new invite link made. the old one no longer works.', good: true },
  removed: { text: 'member removed.', good: true },
  handed: { text: 'you handed the crew over.', good: true },
  already: { text: 'you are already in this crew.', good: true },
  full: { text: `this crew is full (${MAX_MEMBERS} members).`, good: false },
  limit: { text: `you are in ${MAX_CREWS_PER_USER} crews already. leave one to join another.`, good: false },
  name: { text: 'pick a name between 2 and 32 characters.', good: false },
  closedcrew: { text: 'this crew is invite only. ask the owner for the link.', good: false },
};

function avatar(url: string | null, size: number): string {
  return url
    ? `<img src="${escapeHtml(url)}" alt="" width="${size}" height="${size}" loading="lazy" class="av" style="width:${size}px;height:${size}px">`
    : `<span class="av av-empty" style="width:${size}px;height:${size}px" aria-hidden="true"></span>`;
}

function monogram(name: string, slug: string, big = false): string {
  return `<span class="mono${big ? ' mono-xl' : ''}" style="background:${crewShade(slug)}" aria-hidden="true">${escapeHtml(crewInitials(name))}</span>`;
}

function face(f: Face, cls = 'face'): string {
  const initial = escapeHtml(([...f.handle][0] ?? '?').toUpperCase());
  return f.avatarUrl
    ? `<img class="${cls}" src="${escapeHtml(f.avatarUrl)}" alt="" width="22" height="22" loading="lazy" title="${escapeHtml(f.handle)}">`
    : `<span class="${cls} face-empty" style="background:${crewShade(f.handle)}" title="${escapeHtml(f.handle)}" aria-hidden="true">${initial}</span>`;
}

const STYLE = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #0a0a0a; color: #e5e5e5; padding: 32px 16px; }
  main { max-width: 760px; margin: 0 auto; }
  a { color: #a78bfa; text-decoration: none; }
  a:hover { color: #c4b5fd; }
  h1 { font-size: 18px; margin: 0; color: #a78bfa; font-weight: 600; letter-spacing: 0.5px; }
  .sub { color: #666; font-size: 12px; margin: 4px 0 0; }
  .scale { color: #888; font-size: 12px; margin: 6px 0 0; }
  .scale strong { color: #c4b5fd; font-weight: 600; font-variant-numeric: tabular-nums; }
  .scale .range { color: #555; }
  .access { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .head { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; justify-content: space-between; }
  .tabs { display: flex; gap: 4px; margin: 20px 0 8px; border-bottom: 1px solid #1a1a1a; overflow-x: auto; }
  .tab { color: #666; padding: 8px 12px; font-size: 13px; border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; }
  .tab:hover { color: #a78bfa; }
  .tab-active { color: #e5e5e5; border-bottom-color: #a78bfa; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 8px 8px 10px; color: #555; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.6px; border-bottom: 1px solid #1a1a1a; white-space: nowrap; }
  th.r, td.r { text-align: right; }
  td { padding: 12px 8px; border-bottom: 1px solid #141414; vertical-align: middle; font-size: 14px; }
  tr.you td { background: #120d1c; }
  td.rank { width: 40px; color: #666; text-align: right; font-variant-numeric: tabular-nums; }
  td.rank-top { color: #a78bfa; font-weight: 600; }
  td.ships { width: 84px; color: #a78bfa; font-weight: 600; font-size: 16px; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td.ships small { display: block; color: #555; font-size: 10px; font-weight: 400; }
  td.last { width: 100px; color: #666; font-size: 12px; text-align: right; white-space: nowrap; }
  .who { display: flex; align-items: center; gap: 10px; min-width: 0; color: #e5e5e5; }
  a.who:hover { color: #a78bfa; }
  .who .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .who .meta { display: block; color: #555; font-size: 11px; }
  .av { border-radius: 50%; display: block; flex-shrink: 0; }
  .av-empty { background: #1a1a1a; }
  .mono { width: 36px; height: 36px; border-radius: 8px; display: inline-grid; place-items: center; font-weight: 700; font-size: 13px; color: #0a0a0a; background: #a78bfa; flex-shrink: 0; }
  .mono-xl { width: 56px; height: 56px; font-size: 20px; border-radius: 12px; }
  .faces { display: inline-flex; align-items: center; }
  .faces .face { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #0a0a0a; margin-left: -6px; display: inline-grid; place-items: center; font-size: 9px; font-weight: 700; color: #0a0a0a; }
  .faces .face:first-child { margin-left: 0; }
  .faces .more { color: #555; font-size: 11px; margin-left: 6px; }
  .top { display: inline-flex; align-items: center; gap: 8px; color: #888; font-size: 13px; }
  .top:hover { color: #a78bfa; }
  .top-face { width: 22px; height: 22px; border-radius: 50%; display: inline-grid; place-items: center; font-size: 9px; font-weight: 700; color: #0a0a0a; flex-shrink: 0; }
  .tag { font-size: 10px; color: #c4b5fd; border: 1px solid #3b2a5d; border-radius: 999px; padding: 0 6px; margin-left: 6px; white-space: nowrap; }
  .tag-open { color: #86efac; border-color: #1d3b27; }
  .tag-left { color: #888; border-color: #2a2a2a; }
  .heatmap { display: inline-flex; gap: 3px; }
  .cell { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
  .cell-0 { background: #1a1a1a; } .cell-1 { background: #3b2a5d; } .cell-2 { background: #6d4ec8; } .cell-3 { background: #a78bfa; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 8px; padding: 9px 14px; font: inherit; font-size: 13px; cursor: pointer; border: 1px solid #1a1a1a; background: transparent; color: #e5e5e5; white-space: nowrap; text-decoration: none; }
  .btn:hover { border-color: #a78bfa; color: #a78bfa; }
  .btn-primary { background: #a78bfa; color: #0a0a0a; border-color: #a78bfa; font-weight: 600; }
  .btn-primary:hover { background: #c4b5fd; color: #0a0a0a; }
  .btn-danger:hover { border-color: #f87171; color: #f87171; }
  .btn-block { width: 100%; }
  .btn-quiet { color: #666; cursor: default; }
  .btn-quiet:hover { border-color: #1a1a1a; color: #666; }
  form.inline { display: inline; margin: 0; }
  .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 18px 0 4px; }
  .stat { background: #111; border: 1px solid #1a1a1a; border-radius: 8px; padding: 12px; }
  .stat .v { color: #a78bfa; font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .stat .l { color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
  .stat .s { color: #555; font-size: 11px; margin-top: 4px; }
  .box { background: #111; border: 1px dashed #3b2a5d; border-radius: 8px; padding: 10px 12px; margin-top: 18px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .box .lbl { width: 100%; color: #555; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; }
  .box input { flex: 1; min-width: 0; background: transparent; border: 0; color: #c4b5fd; font: inherit; font-size: 12px; }
  .tools { display: flex; flex-direction: column; gap: 14px; margin-top: 18px; padding-top: 16px; border-top: 1px solid #1a1a1a; }
  .tools .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .tools .lbl { color: #555; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; }
  .tools .hint { color: #555; font-size: 11px; }
  .tools input[type=text], .tools select, .field input { background: #070707; border: 1px solid #1a1a1a; border-radius: 8px; padding: 8px 10px; color: #e5e5e5; font: inherit; font-size: 13px; }
  .tools input[type=text]:focus, .field input:focus { outline: none; border-color: #a78bfa; }
  .card { max-width: 440px; margin: 8px auto 0; background: #111; border: 1px solid #1a1a1a; border-radius: 12px; padding: 24px; text-align: center; }
  .card h2 { font-size: 22px; margin: 16px 0 4px; font-weight: 600; }
  .card .facts { color: #666; font-size: 12px; margin: 0 0 18px; }
  .card .facts strong { color: #c4b5fd; font-weight: 600; }
  .card .invited { color: #888; font-size: 12px; display: flex; gap: 8px; align-items: center; justify-content: center; }
  .fine { color: #555; font-size: 11px; margin: 12px 0 0; line-height: 1.6; }
  .steps { text-align: left; margin-top: 20px; padding-top: 16px; border-top: 1px solid #1a1a1a; }
  .steps .lbl { color: #888; font-size: 12px; margin-bottom: 8px; }
  .steps pre { margin: 0; background: #070707; border: 1px solid #1a1a1a; border-radius: 6px; padding: 10px 12px; color: #a78bfa; font-family: inherit; font-size: 12px; overflow-x: auto; }
  .stack { display: inline-flex; justify-content: center; margin-bottom: 18px; }
  .stack .av { border: 2px solid #111; margin-left: -6px; }
  .stack .av:first-child { margin-left: 0; }
  .note { display: block; font-size: 12px; padding: 8px 12px; border-radius: 6px; margin: 0 0 16px; }
  .note-good { color: #86efac; background: #0d1a12; border: 1px solid #1d3b27; }
  .note-bad { color: #fbbf24; background: #1a150a; border: 1px solid #3b2f12; }
  .field { max-width: 440px; margin: 0 auto; }
  .field label { display: block; color: #888; font-size: 12px; margin: 16px 0 6px; }
  .field input { width: 100%; padding: 10px 12px; font-size: 14px; }
  .field .hint { color: #555; font-size: 11px; margin: 6px 0 0; }
  .field .hint b { color: #c4b5fd; font-weight: 400; }
  .empty { text-align: center; color: #666; padding: 32px 12px; }
  footer { color: #444; font-size: 11px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #141414; }
  ${NAV_STYLE}
  ${BACK_STYLE}
  @media (max-width: 600px) {
    body { padding: 20px 12px; }
    td, th { padding-left: 4px; padding-right: 4px; }
    .hide-sm { display: none; }
    .access { align-items: flex-start; }
    .stats { gap: 6px; }
    .stat { padding: 10px 8px; }
    .stat .v { font-size: 18px; }
  }
`;

function page(title: string, place: NavPlace, nav: NavContext, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>${STYLE}</style>
<script src="${COPY_SCRIPT_URL}" defer></script>
</head>
<body>
<main>
  ${renderNav(place, nav)}
  ${body}
</main>
</body>
</html>`;
}

const INSTALL = `<pre>npm i -g vibetime-cli@latest
vibe init
vibe login</pre>`;

function note(message: string | null): string {
  const m = message ? MESSAGES[message] : undefined;
  return m ? `<p class="note ${m.good ? 'note-good' : 'note-bad'}" role="status">${escapeHtml(m.text)}</p>` : '';
}

function tabs(base: string, window: CrewWindow): string {
  return `<nav class="tabs" aria-label="window">${(['week', 'month', 'all'] as const)
    .map((w) => `<a class="tab${w === window ? ' tab-active' : ''}" href="${base}?window=${w}">${WINDOW_LABEL[w]}</a>`).join('')}</nav>`;
}

function rangeLabel(window: CrewWindow, start: Date | null, now: Date): string {
  return start ? ` <span class="range">· ${windowRange(start, now)}</span>` : '';
}

function postButton(action: string, label: string, cls = 'btn', fields: Record<string, string> = {}): string {
  const hidden = Object.entries(fields).map(([k, v]) => `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}">`).join('');
  return `<form class="inline" method="post" action="${escapeHtml(action)}">${hidden}<button class="${cls}" type="submit">${escapeHtml(label)}</button></form>`;
}

export function renderCrewBoard(
  board: BoardEntry[], window: CrewWindow, start: Date | null, now: Date, nav: NavContext, mine: Set<string>,
): string {
  const total = board.reduce((a, b) => a + b.ships, 0);
  const rankedCount = board.filter((c) => c.rank !== null).length;
  const start_ = nav.viewer
    ? `<a class="btn btn-primary" href="/crews/new">+ start a crew</a>`
    : nav.signInEnabled ? `<a class="btn btn-primary" href="/auth/github/start?next=%2Fcrews%2Fnew">+ start a crew</a>` : '';
  const rows = board.length === 0
    ? `<tr><td colspan="5" class="empty">no crews yet. start one and send the link to your people.</td></tr>`
    : board.map((c) => {
      const yours = mine.has(c.slug);
      return `<tr${yours ? ' class="you"' : ''}>
        <td class="rank${c.rank !== null && c.rank <= 3 ? ' rank-top' : ''}">${c.rank ?? '–'}</td>
        <td><a class="who" href="/crew/${escapeHtml(c.slug)}">${monogram(c.name, c.slug)}<span style="min-width:0"><span class="nm">${escapeHtml(c.name)}</span>${yours ? '<span class="tag">your crew</span>' : c.open ? '<span class="tag tag-open">open</span>' : ''}<span class="meta">${c.memberCount} member${c.memberCount === 1 ? '' : 's'}${c.open ? '' : ' · invite only'}${c.rank === null ? ` · needs ${MIN_MEMBERS_TO_RANK - c.memberCount} more member${MIN_MEMBERS_TO_RANK - c.memberCount === 1 ? '' : 's'} to rank` : ''}</span></span></a></td>
        <td class="ships">${c.ships}<small>${Math.round(c.ships / Math.max(1, c.memberCount))} / member</small></td>
        <td class="hide-sm"><span class="faces">${c.faces.map((f) => face(f)).join('')}${c.memberCount > c.faces.length ? `<span class="more">+${c.memberCount - c.faces.length}</span>` : ''}</span></td>
        <td class="hide-sm">${c.top ? `<a class="top" href="/@${escapeHtml(c.top.handle)}">${face(c.top, 'top-face')}<span class="nm">${escapeHtml(c.top.handle)}</span></a>` : ''}</td>
      </tr>`;
    }).join('');
  return page('crews · vibetime', 'crews', nav, `
  <div class="head">
    <div>
      <h1>crews</h1>
      <p class="scale"><strong>${board.length}</strong> crew${board.length === 1 ? '' : 's'}${rankedCount < board.length ? ` · <strong>${rankedCount}</strong> ranked` : ''} · <strong>${total}</strong> ships ${WINDOW_LABEL[window]}${rangeLabel(window, start, now)}</p>
    </div>
    ${start_}
  </div>
  ${tabs('/crews', window)}
  <table>
    <thead><tr><th class="r">#</th><th>crew</th><th class="r">ships</th><th class="hide-sm">members</th><th class="hide-sm">top shipper</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <footer>a crew's number is its members' verified ships, the same ones on the leaderboard, counted for every week they were in the crew. crews are ranked once they have ${MIN_MEMBERS_TO_RANK} members. open crews take anyone; the rest join by invite link.</footer>`);
}

export interface CrewViewerState {
  member: boolean;
  owner: boolean;
}

export function renderCrew(
  crew: Crew, members: MemberEntry[], window: CrewWindow, start: Date | null, now: Date,
  rank: { rank: number; above: BoardEntry | null; count: number } | null,
  nav: NavContext, me: CrewViewerState, message: string | null, origin: string, back: BackLink, needsCli: boolean,
): string {
  const ships = members.reduce((a, m) => a + m.ships, 0);
  const shipping = members.filter((m) => m.current && m.ships > 0).length;
  const base = `/crew/${escapeHtml(crew.slug)}`;
  const signIn = `/auth/github/start?next=${encodeURIComponent(`/crew/${crew.slug}`)}`;

  let access = '';
  if (!me.member) {
    if (crew.open) {
      access = nav.viewer
        ? postButton(`${base}/join`, 'join crew', 'btn btn-primary')
        : nav.signInEnabled ? `<a class="btn btn-primary" href="${signIn}">join with GitHub</a>` : '';
      access = `<div class="access">${access}<span class="sub" style="margin:0">open crew · anyone can join</span></div>`;
    } else {
      access = `<div class="access"><span class="btn btn-quiet" aria-disabled="true">invite only</span><span class="sub" style="margin:0">ask <a href="https://github.com/${escapeHtml(crew.ownerHandle)}" rel="nofollow noopener">@${escapeHtml(crew.ownerHandle)}</a> for an invite</span></div>`;
    }
  }

  const rankStat = rank
    ? `<div class="stat"><div class="v">#${rank.rank}</div><div class="l">rank</div><div class="s">${rank.above ? `${rank.above.ships - ships} behind ${escapeHtml(rank.above.name)}` : `top of ${rank.count} crew${rank.count === 1 ? '' : 's'}`}</div></div>`
    : `<div class="stat"><div class="v">–</div><div class="l">rank</div><div class="s">needs ${MIN_MEMBERS_TO_RANK} members</div></div>`;

  const rows = members.length === 0
    ? `<tr><td colspan="5" class="empty">no members yet.</td></tr>`
    : members.map((m, i) => {
      const you = nav.viewer?.githubId === m.githubId;
      const removable = me.owner && !you && m.current;
      return `<tr${you ? ' class="you"' : ''}>
        <td class="rank${i < 3 && m.ships > 0 ? ' rank-top' : ''}">${i + 1}</td>
        <td><div class="who"><a class="who" href="/@${escapeHtml(m.handle)}">${avatar(m.avatarUrl, 24)}<span class="nm">${escapeHtml(m.handle)}</span></a>${you ? '<span class="tag">you</span>' : ''}${m.githubId === crew.ownerGithubId ? '<span class="tag">owner</span>' : ''}${m.current ? '' : '<span class="tag tag-left">left</span>'}${removable ? ` <a class="sub" style="margin:0 0 0 6px" href="${base}/confirm?action=remove&amp;member=${m.githubId}">remove</a>` : ''}</div></td>
        <td class="ships">${m.ships}<small>${m.days} day${m.days === 1 ? '' : 's'}</small></td>
        <td class="hide-sm"><span class="heatmap">${heatmapCells(m.recentDays)}</span></td>
        <td class="last hide-sm">${m.lastShippedAt ? escapeHtml(relativeTime(m.lastShippedAt, now)) : '–'}</td>
      </tr>`;
    }).join('');

  const inviteUrl = `${origin}/join/${crew.inviteCode}`;
  const setup = me.member && needsCli ? `
  <div class="steps" style="margin-top:18px"><div class="lbl">set up vibetime so your ships count here:</div>${INSTALL}</div>` : '';
  const memberTools = me.member ? `${setup}
  <div class="box">
    <span class="lbl">invite people · anyone with this link can join</span>
    <input id="invite-link" type="text" readonly value="${escapeHtml(inviteUrl)}" aria-label="invite link">
    <button class="btn btn-primary" type="button" data-copy="${escapeHtml(inviteUrl)}">copy link</button>
  </div>` : '';

  const handoverOptions = members.filter((m) => m.current && m.githubId !== crew.ownerGithubId)
    .map((m) => `<option value="${m.githubId}">${escapeHtml(m.handle)}</option>`).join('');
  const ownerTools = me.owner ? `
  <div class="tools">
    <div class="row">
      ${postButton(`${base}/settings`, crew.open ? 'make invite only' : 'open to anyone', 'btn', { action: crew.open ? 'close' : 'open' })}
      <span class="hint">${crew.open ? 'open: anyone can join from this page' : 'invite only: people need the link to join'}</span>
    </div>
    <form class="row" method="post" action="${base}/settings"><input type="hidden" name="action" value="rename"><input type="text" name="name" value="${escapeHtml(crew.name)}" maxlength="${NAME_MAX}" aria-label="crew name"><button class="btn" type="submit">rename</button></form>
    ${handoverOptions ? `<form class="row" method="post" action="${base}/settings"><input type="hidden" name="action" value="handover"><select name="member" aria-label="new owner">${handoverOptions}</select><button class="btn" type="submit">hand over</button></form>` : ''}
    <div class="row">
      ${postButton(`${base}/settings`, 'reset invite link', 'btn', { action: 'reset' })}
      <a class="btn btn-danger" href="${base}/confirm?action=delete">delete crew</a>
    </div>
  </div>` : me.member ? `
  <div class="tools"><div class="row"><a class="btn btn-danger" href="${base}/confirm?action=leave">leave crew</a></div></div>` : '';

  return page(`${crew.name} · vibetime crews`, 'crews', nav, `
  ${renderBack(back)}
  ${note(message)}
  <div class="head">
    <div class="who" style="gap:14px">${monogram(crew.name, crew.slug, true)}<div>
      <h1 style="color:#e5e5e5;font-size:22px">${escapeHtml(crew.name)}${crew.open ? ' <span class="tag tag-open">open</span>' : ''}</h1>
      <p class="sub">${crew.memberCount} member${crew.memberCount === 1 ? '' : 's'} · started by <a href="/@${escapeHtml(crew.ownerHandle)}">@${escapeHtml(crew.ownerHandle)}</a>${rank ? ` · <span style="color:#c4b5fd">#${rank.rank} of ${rank.count} crews</span>` : ''}</p>
    </div></div>
    ${access}
  </div>
  <div class="stats">
    <div class="stat"><div class="v">${ships}</div><div class="l">ships</div><div class="s">${WINDOW_LABEL[window]}</div></div>
    ${rankStat}
    <div class="stat"><div class="v">${shipping}/${crew.memberCount}</div><div class="l">shipping</div><div class="s">members ${WINDOW_LABEL[window]}</div></div>
  </div>
  ${tabs(base, window)}
  ${start ? `<p class="scale" style="margin:0 0 4px"><span class="range">${windowRange(start, now)}</span></p>` : ''}
  <table>
    <thead><tr><th class="r">#</th><th>member</th><th class="r">ships</th><th class="hide-sm">last 7 days</th><th class="r hide-sm">last shipped</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${memberTools}
  ${ownerTools}`);
}

export function renderInvite(
  crew: Crew, weekShips: number, rank: number | null, crewCount: number, avatars: (string | null)[],
  nav: NavContext, state: 'signed-out' | 'can-join' | 'limit' | 'full', code: string, inCrews: number, needsCli: boolean,
): string {
  const install = `<div class="steps"><div class="lbl">new to vibetime? set it up so your ships count:</div>${INSTALL}</div>`;
  const action = state === 'signed-out'
    ? (nav.signInEnabled ? `<a class="btn btn-primary btn-block" href="/auth/github/start?next=${encodeURIComponent(`/join/${code}`)}">join with GitHub</a>` : '')
    : state === 'can-join'
      ? `<form method="post" action="/join/${escapeHtml(code)}"><button class="btn btn-primary btn-block" type="submit">join ${escapeHtml(crew.name)}</button></form>
         <p class="fine">signed in as @${escapeHtml(nav.viewer?.handle ?? '')} · you are in ${inCrews} of ${MAX_CREWS_PER_USER} crews</p>`
      : state === 'limit'
        ? `<span class="btn btn-quiet btn-block">you are in ${MAX_CREWS_PER_USER} crews</span><p class="fine">leave one of your crews to join this one.</p>`
        : `<span class="btn btn-quiet btn-block">this crew is full</span><p class="fine">it has ${MAX_MEMBERS} members. ask @${escapeHtml(crew.ownerHandle)} about it.</p>`;
  return page(`join ${crew.name} · vibetime`, 'crews', nav, `
  <div class="card">
    <div class="invited">you're invited to join a crew on vibetime</div>
    <div style="margin-top:16px">${monogram(crew.name, crew.slug, true)}</div>
    <h2>${escapeHtml(crew.name)}</h2>
    <p class="facts">started by @${escapeHtml(crew.ownerHandle)}<br><strong>${crew.memberCount}</strong> member${crew.memberCount === 1 ? '' : 's'} · <strong>${weekShips}</strong> ships this week${rank ? ` · <strong>#${rank}</strong> of ${crewCount} crews` : ''}</p>
    ${avatars.length ? `<div class="stack">${avatars.map((a) => avatar(a, 22)).join('')}</div>` : ''}
    ${action}
    <p class="fine">joining puts your handle and ship counts on this crew's public page. you can leave any time.</p>
    ${state === 'signed-out' || needsCli ? install : ''}
  </div>`);
}

export function renderInviteGone(nav: NavContext): string {
  return page('invite link · vibetime', 'crews', nav, `
  <div class="card">
    <h2>this invite link no longer works</h2>
    <p class="facts">the crew may have been deleted, or its owner made a new link.</p>
    <a class="btn btn-block" href="/crews">see all crews</a>
  </div>`);
}

export function renderCrewMissing(nav: NavContext): string {
  return page('no crew here · vibetime', 'crews', nav, `
  <div class="card">
    <h2>no crew here</h2>
    <p class="facts">this crew does not exist or was deleted.</p>
    <a class="btn btn-block" href="/crews">see all crews</a>
  </div>`);
}

export function renderCreate(nav: NavContext, crewCount: number, message: string | null, name: string, host: string): string {
  const atLimit = crewCount >= MAX_CREWS_PER_USER;
  return page('start a crew · vibetime', 'crews', nav, `
  <form class="field" method="post" action="/crews">
    ${note(message)}
    <h1>start a crew</h1>
    <p class="sub">a crew is a name and the people who join it. you can rename it later.</p>
    <label for="crew-name">crew name</label>
    <input id="crew-name" name="name" value="${escapeHtml(name)}" minlength="2" maxlength="${NAME_MAX}" autocomplete="off" required ${atLimit ? 'disabled' : 'autofocus'}>
    <p class="hint">your crew lives at <b id="slug-preview" data-host="${escapeHtml(host)}">${escapeHtml(host)}/crew/${escapeHtml(name ? slugFor(name) : '…')}</b></p>
    <div style="margin-top:20px">${atLimit
      ? `<span class="btn btn-quiet btn-block">you are in ${MAX_CREWS_PER_USER} crews already</span>`
      : `<button class="btn btn-primary btn-block" type="submit">start crew</button>`}</div>
    <p class="fine">you are in ${crewCount} of ${MAX_CREWS_PER_USER} crews. crews are public: the name, members and their ship counts show on vibetime.club. new crews are invite only; you can open yours later.</p>
  </form>`);
}

export function renderConfirm(nav: NavContext, title: string, body: string, action: string, fields: Record<string, string>, label: string, back: string): string {
  return page(`${title} · vibetime`, 'crews', nav, `
  <div class="card" style="text-align:left">
    <h2 style="margin-top:0">${escapeHtml(title)}</h2>
    <p class="facts" style="font-size:13px">${escapeHtml(body)}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${postButton(action, label, 'btn btn-danger', fields)}<a class="btn" href="${escapeHtml(back)}">cancel</a></div>
  </div>`);
}

// Mirrors slugFor for the preview only; the server decides the real address.
export const COPY_SCRIPT = `document.addEventListener('input', function (e) {
  if (!e.target || e.target.id !== 'crew-name') return;
  var out = document.getElementById('slug-preview');
  if (!out) return;
  var slug = e.target.value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32).replace(/-+$/, '');
  out.textContent = out.getAttribute('data-host') + '/crew/' + (slug || '…');
});
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-copy]');
  if (!b) return;
  var text = b.getAttribute('data-copy');
  var done = function () { b.textContent = 'copied'; setTimeout(function () { b.textContent = 'copy link'; }, 2000); };
  var fallback = function () { var i = document.getElementById('invite-link'); if (i) { i.focus(); i.select(); } };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
});
`;

// The URL carries a fingerprint of the script, so a browser holding the old
// copy fetches the new one the moment it changes instead of an hour later.
function fingerprint(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(36);
}
export const COPY_SCRIPT_URL = `/assets/copy.js?v=${fingerprint(COPY_SCRIPT)}`;
