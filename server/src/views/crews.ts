import type { BoardEntry, Crew, CrewWindow, Face, MemberEntry } from '../crews.js';
import { MAX_CREWS_PER_USER, MAX_MEMBERS, MIN_MEMBERS_TO_RANK, NAME_MAX, slugFor } from '../crews.js';
import { avatar, command, crewInitials, crewShade, escapeHtml, formatCount, renderBack, renderPage, type BackLink, type NavContext, type NavPlace } from './layout.js';
import { heatmap, liveDot, relativeTime, windowRange } from './leaderboard.js';
import { icon } from './style.js';

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

function monogram(name: string, slug: string, big = false): string {
  return `<span class="mono${big ? ' mono-xl' : ''}" style="background:${crewShade(slug)}" aria-hidden="true">${escapeHtml(crewInitials(name))}</span>`;
}

function face(f: Face, cls = 'face'): string {
  const initial = escapeHtml(([...f.handle][0] ?? '?').toUpperCase());
  return f.avatarUrl
    ? `<img class="${cls}" src="${escapeHtml(f.avatarUrl)}" alt="" width="22" height="22" loading="lazy" title="${escapeHtml(f.handle)}">`
    : `<span class="${cls} face-empty" style="background:${crewShade(f.handle)}" title="${escapeHtml(f.handle)}" aria-hidden="true">${initial}</span>`;
}

interface Preview {
  title: string;
  description: string;
}

function page(title: string, place: NavPlace, nav: NavContext, body: string, preview?: Preview): string {
  return renderPage({ title, place, nav, body, preview });
}

const INSTALL = command(['npm i -g vibetime-cli@latest', 'vibe init', 'vibe login']);

function note(message: string | null): string {
  const m = message ? MESSAGES[message] : undefined;
  return m ? `<p class="note ${m.good ? 'note-good' : 'note-bad'}" role="status">${icon(m.good ? 'circle-check' : 'alert')}<span>${escapeHtml(m.text)}</span></p>` : '';
}

function tabs(base: string, window: CrewWindow): string {
  return `<nav class="tabs" aria-label="window">${(['week', 'month', 'all'] as const)
    .map((w) => `<a class="tab${w === window ? ' tab-active' : ''}" href="${base}?window=${w}">${WINDOW_LABEL[w]}</a>`).join('')}</nav>`;
}

function rangeLabel(window: CrewWindow, start: Date | null, now: Date): string {
  return start ? ` <span class="range">· ${windowRange(start, now)}</span>` : '';
}

function membersLabel(n: number): string {
  return `${n} member${n === 1 ? '' : 's'}`;
}

function postButton(action: string, label: string, cls = 'btn', fields: Record<string, string> = {}, glyph = ''): string {
  const hidden = Object.entries(fields).map(([k, v]) => `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}">`).join('');
  return `<form class="inline" method="post" action="${escapeHtml(action)}">${hidden}<button class="${cls}" type="submit">${glyph}${escapeHtml(label)}</button></form>`;
}

const OPEN_TAG = `<span class="tag tag-open">${icon('globe')}open</span>`;

export function renderCrewBoard(
  board: BoardEntry[], window: CrewWindow, start: Date | null, now: Date, nav: NavContext, mine: Set<string>,
): string {
  const total = board.reduce((a, b) => a + b.ships, 0);
  const rankedCount = board.filter((c) => c.rank !== null).length;
  const start_ = nav.viewer
    ? `<a class="btn btn-primary" href="/crews/new">${icon('plus')}start a crew</a>`
    : nav.signInEnabled ? `<a class="btn btn-primary" href="/auth/github/start?next=%2Fcrews%2Fnew">${icon('plus')}start a crew</a>` : '';
  const rows = board.length === 0
    ? `<tr><td colspan="5"><div class="empty"><p>no crews yet. start one and send the link to your people.</p></div></td></tr>`
    : board.map((c) => {
      const yours = mine.has(c.slug);
      const toRank = MIN_MEMBERS_TO_RANK - c.memberCount;
      return `<tr${yours ? ' class="you"' : ''}>
        <td class="rank${c.rank !== null && c.rank <= 3 ? ' rank-top' : ''}">${c.rank ?? '–'}</td>
        <td><a class="who" href="/crew/${escapeHtml(c.slug)}">${monogram(c.name, c.slug)}<span class="who-t"><span class="who-l1"><span class="nm">${escapeHtml(c.name)}</span>${yours ? '<span class="tag tag-you">your crew</span>' : c.open ? OPEN_TAG : ''}</span><span class="meta">${c.memberCount} member${c.memberCount === 1 ? '' : 's'}${c.open ? '' : ' · invite only'}${c.rank === null ? ` · needs ${toRank} more member${toRank === 1 ? '' : 's'} to rank` : ''}</span>${c.top ? `<span class="meta-sm">top: ${escapeHtml(c.top.handle)}</span>` : ''}</span></a></td>
        <td class="ships">${formatCount(c.ships)}<small>${formatCount(Math.round(c.ships / Math.max(1, c.memberCount)))} / member</small></td>
        <td class="hide-sm"><span class="faces">${c.faces.map((f) => face(f)).join('')}${c.memberCount > c.faces.length ? `<span class="more">+${c.memberCount - c.faces.length}</span>` : ''}</span></td>
        <td class="hide-sm">${c.top ? `<a class="top" href="/@${escapeHtml(c.top.handle)}">${face(c.top, 'top-face')}<span class="nm">${escapeHtml(c.top.handle)}</span></a>` : ''}</td>
      </tr>`;
    }).join('');
  return page('crews · vibetime', 'crews', nav, `
  <header class="head">
    <div>
      <h1>crews</h1>
      <p class="scale"><strong>${board.length}</strong> crew${board.length === 1 ? '' : 's'}${rankedCount < board.length ? ` · <strong>${rankedCount}</strong> ranked` : ''} · <strong>${formatCount(total)}</strong> ships ${WINDOW_LABEL[window]}${rangeLabel(window, start, now)}</p>
    </div>
    ${start_}
  </header>
  ${tabs('/crews', window)}
  <table style="margin-top:20px">
    <thead><tr><th class="r">#</th><th>crew</th><th class="r">ships</th><th class="hide-sm">members</th><th class="hide-sm">top shipper</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="def">A crew's number is its members' verified ships, the same ones on the leaderboard, counted for every week they were in the crew. Crews are ranked once they have ${MIN_MEMBERS_TO_RANK} members. Open crews take anyone; the rest join by invite link.</p>`, {
    title: 'vibetime crews',
    description: `${board.length} crew${board.length === 1 ? '' : 's'} shipping together on vibetime. ${formatCount(total)} ships ${WINDOW_LABEL[window]}.`,
  });
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
        : nav.signInEnabled ? `<a class="btn btn-primary" href="${signIn}">${icon('github')}join with GitHub</a>` : '';
      access = `<div class="access">${access}<span>open crew · anyone can join</span></div>`;
    } else {
      access = `<div class="access"><span class="btn btn-quiet" aria-disabled="true">${icon('lock')}invite only</span><span>ask <a href="https://github.com/${escapeHtml(crew.ownerHandle)}" rel="nofollow noopener">@${escapeHtml(crew.ownerHandle)}</a> for an invite</span></div>`;
    }
  }

  const rankStat = rank
    ? `<div class="stat"><div class="v">#${rank.rank}</div><div class="l">rank</div><div class="s">${rank.above ? `${formatCount(rank.above.ships - ships)} behind ${escapeHtml(rank.above.name)}` : `top of ${rank.count} crew${rank.count === 1 ? '' : 's'}`}</div></div>`
    : `<div class="stat"><div class="v">–</div><div class="l">rank</div><div class="s">needs ${MIN_MEMBERS_TO_RANK} members</div></div>`;

  const rows = members.length === 0
    ? `<tr><td colspan="5"><div class="empty"><p>no members yet.</p></div></td></tr>`
    : members.map((m, i) => {
      const you = nav.viewer?.githubId === m.githubId;
      const removable = me.owner && !you && m.current;
      const last = m.lastShippedAt ? `${liveDot(m.lastShippedAt, now)}${escapeHtml(relativeTime(m.lastShippedAt, now))}` : '–';
      const tags = `${you ? '<span class="tag tag-you">you</span>' : ''}${m.githubId === crew.ownerGithubId ? '<span class="tag">owner</span>' : ''}${m.current ? '' : '<span class="tag tag-left">left</span>'}`;
      return `<tr${you ? ' class="you"' : ''}>
        <td class="rank${i < 3 && m.ships > 0 ? ' rank-top' : ''}">${i + 1}</td>
        <td><div class="who"><a class="who" href="/@${escapeHtml(m.handle)}">${avatar(m.avatarUrl, 28)}<span class="who-t"><span class="who-l1"><span class="nm">${escapeHtml(m.handle)}</span>${tags}</span><span class="meta-sm">${heatmap(m.recentDays, true)}<span>${last}</span></span></span></a>${removable ? `<a class="remove" href="${base}/confirm?action=remove&amp;member=${m.githubId}">remove</a>` : ''}</div></td>
        <td class="ships">${formatCount(m.ships)}<small>${m.days} day${m.days === 1 ? '' : 's'}</small></td>
        <td class="heat hide-sm">${heatmap(m.recentDays)}</td>
        <td class="last hide-sm">${last}</td>
      </tr>`;
    }).join('');

  const inviteUrl = `${origin}/join/${crew.inviteCode}`;
  const setup = me.member && needsCli ? `
  <div class="steps" style="margin-top:24px"><div class="lbl">set up vibetime so your ships count here:</div>${INSTALL}</div>` : '';
  const memberTools = me.member ? `${setup}
  <section class="panel">
    <div class="panel-h"><h2>invite people</h2><span>anyone with this link can join</span></div>
    <div class="panel-b"><div class="invite-line">
      <input class="input" id="invite-link" type="text" readonly value="${escapeHtml(inviteUrl)}" aria-label="invite link">
      <button class="btn btn-primary" type="button" data-copy="${escapeHtml(inviteUrl)}">${icon('copy')}<span class="copy-idle">copy link</span><span class="copy-done">copied</span></button>
    </div></div>
  </section>` : '';

  const handoverOptions = members.filter((m) => m.current && m.githubId !== crew.ownerGithubId)
    .map((m) => `<option value="${m.githubId}">${escapeHtml(m.handle)}</option>`).join('');
  const ownerTools = me.owner ? `
  <section class="panel tools">
    <div class="panel-h"><h2>settings</h2><span>only the owner sees these</span></div>
    <div class="row">
      <div><span class="t">who can join</span><div class="d">${crew.open ? 'open: anyone can join from this page' : 'invite only: people need the link to join'}</div></div>
      <div class="c">${postButton(`${base}/settings`, crew.open ? 'make invite only' : 'open to anyone', 'btn', { action: crew.open ? 'close' : 'open' }, icon(crew.open ? 'lock' : 'globe'))}</div>
    </div>
    <form class="row" method="post" action="${base}/settings">
      <div><label class="t" for="crew-rename">name</label><div class="d">the address stays the same</div></div>
      <div class="c"><input type="hidden" name="action" value="rename"><input class="input" id="crew-rename" type="text" name="name" value="${escapeHtml(crew.name)}" maxlength="${NAME_MAX}"><button class="btn" type="submit">rename</button></div>
    </form>
    ${handoverOptions ? `<form class="row" method="post" action="${base}/settings">
      <div><label class="t" for="crew-owner">owner</label><div class="d">hand the crew to another member</div></div>
      <div class="c"><input type="hidden" name="action" value="handover"><select class="input" id="crew-owner" name="member">${handoverOptions}</select><button class="btn" type="submit">hand over</button></div>
    </form>` : ''}
    <div class="row">
      <div><span class="t">invite link</span><div class="d">make a new link and turn the old one off</div></div>
      <div class="c">${postButton(`${base}/settings`, 'reset invite link', 'btn', { action: 'reset' }, icon('link'))}</div>
    </div>
    <div class="row danger">
      <div><span class="t">delete crew</span><div class="d">the crew page and its board go away for everyone</div></div>
      <div class="c"><a class="btn btn-danger" href="${base}/confirm?action=delete">delete crew</a></div>
    </div>
  </section>` : me.member ? `
  <section class="panel tools">
    <div class="row danger">
      <div><span class="t">leave crew</span><div class="d">weeks you were in keep your ships</div></div>
      <div class="c"><a class="btn btn-danger" href="${base}/confirm?action=leave">leave crew</a></div>
    </div>
  </section>` : '';

  return page(`${crew.name} · vibetime crews`, 'crews', nav, `
  ${renderBack(back)}
  ${note(message)}
  <header class="head crew-head">
    <div class="who">${monogram(crew.name, crew.slug, true)}<div>
      <h1>${escapeHtml(crew.name)}${crew.open ? ` ${OPEN_TAG}` : ''}</h1>
      <p class="sub">${membersLabel(crew.memberCount)} · started by <a href="/@${escapeHtml(crew.ownerHandle)}">@${escapeHtml(crew.ownerHandle)}</a>${rank ? ` · #${rank.rank} of ${rank.count} crew${rank.count === 1 ? '' : 's'}` : ''}</p>
    </div></div>
    ${access}
  </header>
  <div class="stats" style="margin-top:4px">
    <div class="stat"><div class="v">${formatCount(ships)}</div><div class="l">ships</div><div class="s">${WINDOW_LABEL[window]}</div></div>
    ${rankStat}
    <div class="stat"><div class="v">${shipping}/${crew.memberCount}</div><div class="l">shipping</div><div class="s">members ${WINDOW_LABEL[window]}</div></div>
  </div>
  ${tabs(base, window)}
  ${start ? `<p class="scale" style="margin:10px 0 0"><span class="range">${windowRange(start, now)}</span></p>` : ''}
  <table style="margin-top:16px">
    <thead><tr><th class="r">#</th><th>member</th><th class="r">ships</th><th class="hide-sm">last 7 days</th><th class="r hide-sm">last shipped</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${memberTools}
  ${ownerTools}`, {
    title: `${crew.name} on vibetime`,
    description: `a crew of ${membersLabel(crew.memberCount)}, ${formatCount(ships)} ships ${WINDOW_LABEL[window]}${rank ? `, #${rank.rank} of ${rank.count} crew${rank.count === 1 ? '' : 's'}` : ''}. started by @${crew.ownerHandle}.`,
  });
}

export function renderInvite(
  crew: Crew, weekShips: number, rank: number | null, crewCount: number, avatars: (string | null)[],
  nav: NavContext, state: 'signed-out' | 'can-join' | 'limit' | 'full', code: string, inCrews: number, needsCli: boolean,
): string {
  const install = `<div class="divider"></div><div class="steps"><div class="lbl">new to vibetime? set it up so your ships count:</div>${INSTALL}</div>`;
  const action = state === 'signed-out'
    ? (nav.signInEnabled ? `<a class="btn btn-primary btn-block" href="/auth/github/start?next=${encodeURIComponent(`/join/${code}`)}">${icon('github')}join with GitHub</a>` : '')
    : state === 'can-join'
      ? `<form method="post" action="/join/${escapeHtml(code)}" style="width:100%"><button class="btn btn-primary btn-block" type="submit">join ${escapeHtml(crew.name)}</button></form>
         <p class="fine">signed in as @${escapeHtml(nav.viewer?.handle ?? '')} · you are in ${inCrews} of ${MAX_CREWS_PER_USER} crews</p>`
      : state === 'limit'
        ? `<span class="btn btn-quiet btn-block">you are in ${MAX_CREWS_PER_USER} crews</span><p class="fine">leave one of your crews to join this one.</p>`
        : `<span class="btn btn-quiet btn-block">this crew is full</span><p class="fine">it has ${MAX_MEMBERS} members. ask @${escapeHtml(crew.ownerHandle)} about it.</p>`;
  return page(`join ${crew.name} · vibetime`, 'crews', nav, `
  <div class="card center">
    <p class="invited">you're invited to join a crew on vibetime</p>
    ${monogram(crew.name, crew.slug, true)}
    <h1>${escapeHtml(crew.name)}</h1>
    <p class="facts">started by @${escapeHtml(crew.ownerHandle)}<br><strong>${crew.memberCount}</strong> member${crew.memberCount === 1 ? '' : 's'} · <strong>${formatCount(weekShips)}</strong> ships this week${rank ? ` · <strong>#${rank}</strong> of ${crewCount} crew${crewCount === 1 ? '' : 's'}` : ''}</p>
    ${avatars.length ? `<div class="stack">${avatars.map((a) => avatar(a, 26)).join('')}</div>` : ''}
    ${action}
    <p class="fine">joining puts your handle and ship counts on this crew's public page. you can leave any time.</p>
    ${state === 'signed-out' || needsCli ? install : ''}
  </div>`, {
    title: `join ${crew.name} on vibetime`,
    description: `you're invited. ${membersLabel(crew.memberCount)}, ${formatCount(weekShips)} ships this week${rank ? `, #${rank} of ${crewCount} crew${crewCount === 1 ? '' : 's'}` : ''}. started by @${crew.ownerHandle}.`,
  });
}

export function renderInviteGone(nav: NavContext): string {
  return page('invite link · vibetime', 'crews', nav, `
  <div class="card center">
    <h1>this invite link no longer works</h1>
    <p class="facts">the crew may have been deleted, or its owner made a new link.</p>
    <a class="btn btn-block" href="/crews">see all crews</a>
  </div>`);
}

export function renderCrewMissing(nav: NavContext): string {
  return page('no crew here · vibetime', 'crews', nav, `
  <div class="card center">
    <h1>no crew here</h1>
    <p class="facts">this crew does not exist or was deleted.</p>
    <a class="btn btn-block" href="/crews">see all crews</a>
  </div>`);
}

export function renderCreate(nav: NavContext, crewCount: number, message: string | null, name: string, host: string): string {
  const atLimit = crewCount >= MAX_CREWS_PER_USER;
  return page('start a crew · vibetime', 'crews', nav, `
  <form class="card" method="post" action="/crews">
    ${note(message)}
    <div><h1>start a crew</h1><p class="sub">a crew is a name and the people who join it. you can rename it later.</p></div>
    <div class="field">
      <label for="crew-name">crew name</label>
      <input class="input" id="crew-name" name="name" value="${escapeHtml(name)}" minlength="2" maxlength="${NAME_MAX}" autocomplete="off" required ${atLimit ? 'disabled' : 'autofocus'}>
      <p class="hint">your crew lives at <b id="slug-preview" data-host="${escapeHtml(host)}">${escapeHtml(host)}/crew/${escapeHtml(name ? slugFor(name) : '…')}</b></p>
    </div>
    ${atLimit
      ? `<span class="btn btn-quiet btn-block">you are in ${MAX_CREWS_PER_USER} crews already</span>`
      : `<button class="btn btn-primary btn-block" type="submit">start crew</button>`}
    <p class="fine">you are in ${crewCount} of ${MAX_CREWS_PER_USER} crews. crews are public: the name, members and their ship counts show on vibetime.club. new crews are invite only; you can open yours later.</p>
  </form>`);
}

export function renderConfirm(nav: NavContext, title: string, body: string, action: string, fields: Record<string, string>, label: string, back: string): string {
  return page(`${title} · vibetime`, 'crews', nav, `
  <div class="card">
    <h1>${escapeHtml(title)}</h1>
    <p class="facts">${escapeHtml(body)}</p>
    <div class="actions">${postButton(action, label, 'btn btn-danger', fields)}<a class="btn" href="${escapeHtml(back)}">cancel</a></div>
  </div>`);
}
