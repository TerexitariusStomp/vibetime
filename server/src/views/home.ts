import type { BoardEntry } from '../crews.js';
import type { LeaderboardEntry } from '../routes/leaderboard.js';
import type { StatsData } from '../routes/stats.js';
import { monogram } from './crews.js';
import { avatar, command, escapeHtml, formatCount, renderPage, type NavContext } from './layout.js';
import { gem, icon } from './style.js';

// The README's tier table, so the rules are on the first page anyone sees.
const TIERS: [string, number, string][] = [
  ['shipped', 8, 'a commit plus more than 50 lines or more than 3 files'],
  ['progressed', 6, 'commits, small changes'],
  ['tinkering', 4, 'changes but no commits'],
  ['exploring', 2, 'a few lines touched'],
  ['idle', 0, 'nothing changed'],
  ['interrupted', 0, 'session killed or crashed'],
];

// The tier bar from the endcard: ten segments, the first `filled` lit.
function tierBar(filled: number): string {
  return `<span class="mbar" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i${i < filled ? ' class="on"' : ''}></i>`).join('')}</span>`;
}

function sectionHead(title: string, link?: { href: string; label: string }): string {
  return `<div class="sec-h"><h2>${title}</h2>${link ? `<a href="${link.href}">${link.label}${icon('arrow-right')}</a>` : ''}</div>`;
}

export function renderHome(stats: StatsData, week: LeaderboardEntry[], crews: BoardEntry[], nav: NavContext): string {
  const topDevs = week.length === 0
    ? '<p class="mini-empty">nothing shipped this week yet. the week starts monday 00:00 utc.</p>'
    : `<ol class="mini">${week.slice(0, 5).map((e) => `<li><span class="rk">${e.rank}</span><a class="who" href="/@${escapeHtml(e.handle)}">${avatar(e.avatarUrl, 24)}<span class="nm">${escapeHtml(e.handle)}</span></a><span class="n">${formatCount(e.shippedCount)}</span></li>`).join('')}</ol>`;
  const ranked = crews.filter((c) => c.rank !== null).slice(0, 3);
  const topCrews = ranked.length === 0
    ? '<p class="mini-empty">no ranked crews yet. start one and send the link to your people.</p>'
    : `<ol class="mini">${ranked.map((c) => `<li><span class="rk">${c.rank}</span><a class="who" href="/crew/${escapeHtml(c.slug)}">${monogram(c.name, c.slug)}<span class="nm">${escapeHtml(c.name)}</span></a><span class="n">${formatCount(c.ships)}</span></li>`).join('')}</ol>`;

  return renderPage({
    title: 'vibetime: track what you vibe',
    place: null,
    nav,
    preview: {
      title: 'vibetime',
      description: 'track what you actually ship with AI. vibetime reads git, never your code, and ranks developers by what they ship.',
    },
    body: `<section class="hero">
    <div>
      <h1 class="display">track what you vibe.</h1>
      <p class="lead">every session you ship with AI, counted from git. vibetime wraps claude, codex, gemini, aster and opencode, and hooks into the Claude Code, Codex and Cursor apps. it never reads your code.</p>
      <div class="actions"><a class="btn btn-primary" href="/leaderboard">${icon('trophy')}see this week's leaderboard</a><a class="btn" href="https://github.com/iamnotstatic/vibetime">${icon('github')}github</a></div>
    </div>
    <div class="hero-term">
    ${command(['npm i -g vibetime-cli', 'vibe init', 'vibe login'])}
    <figure class="endcard" aria-label="the endcard after a session">
      <div class="endcard-h">${gem(16)}<b>vibe</b><span>·</span><span>api</span><span>·</span><span>2h 14m</span></div>
      <div class="endcard-b">
        <div>3 commits <span class="dim">·</span> <span class="plus">+847</span> <span class="minus">−231</span> <span class="dim">·</span> 12 files</div>
        <div class="endcard-tier">${tierBar(8)}<span>shipped</span>${icon('spark')}</div>
      </div>
    </figure>
    </div>
  </section>
  <a class="kpis" href="/stats" aria-label="all-time stats">
    <span class="kpi"><span class="v">${formatCount(stats.devs)}</span><span class="l">developers</span></span>
    <span class="kpi"><span class="v">${formatCount(stats.ships)}</span><span class="l">ships, all time</span></span>
    <span class="kpi"><span class="v">${formatCount(stats.projects)}</span><span class="l">projects</span></span>
    <span class="kpi"><span class="v">${formatCount(stats.crews)}</span><span class="l">crews</span></span>
  </a>
  <div class="split">
    <div>${sectionHead('this week', { href: '/leaderboard', label: 'full leaderboard' })}<div class="panel">${topDevs}</div></div>
    <div>${sectionHead('top crews', { href: '/crews', label: 'all crews' })}<div class="panel">${topCrews}</div></div>
  </div>
  ${sectionHead('how sessions score')}
  <div class="panel"><table class="tiers"><tbody>${TIERS.map(([tier, filled, meaning]) =>
    `<tr><td>${tierBar(filled)}</td><td><span class="tn${tier === 'shipped' ? ' tn-on' : ''}">${tier}</span><span class="tm">${meaning}</span></td></tr>`).join('')}</tbody></table></div>
  <p class="def">only <b>shipped</b> sessions count on the leaderboard.</p>
  ${sectionHead('what it reads')}
  <div class="trio">
    <div><b>${icon('commit')}git metadata only</b>commit, line and file counts. never file contents, prompts or model output.</div>
    <div><b>${icon('lock')}local until you log in</b>sessions stay in ~/.vibe. nothing leaves your machine before vibe login.</div>
    <div><b>${icon('github')}open source</b>MIT licensed. the README lists every field it sends.</div>
  </div>`,
  });
}
