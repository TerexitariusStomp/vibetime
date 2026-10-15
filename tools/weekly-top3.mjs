#!/usr/bin/env node
// Weekly top-3 shippers, for the Monday announcement.
//
// The leaderboard's week window resets Monday 00:00 UTC, so by announcement
// time the site can no longer show last week. This queries ship_events for the
// previous completed Mon-Sun week directly (wrangler, run from anywhere in the
// repo), using the same ordering as the leaderboard route so the announcement
// never disagrees with what people saw on Sunday night.
//
//   node tools/weekly-top3.mjs             last completed week
//   node tools/weekly-top3.mjs --current   the running week (preview)
//   node tools/weekly-top3.mjs --html      also open a screenshot-ready card,
//                                          same move as `vibe share` + h
//
// The paste block uses bare handles on purpose: these are GitHub handles, and
// an @ in a tweet would tag unrelated Twitter accounts.
import { execFileSync, spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const current = process.argv.includes('--current');
const wantHtml = process.argv.includes('--html');

const now = new Date();
const dow = now.getUTCDay();
const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (dow === 0 ? 6 : dow - 1)));
const start = current ? monday : new Date(monday.getTime() - 7 * 86400000);
const end = new Date(start.getTime() + 6 * 86400000);
const day = (d) => d.toISOString().slice(0, 10);

const sql = `SELECT u.handle, u.avatar_url, SUM(e.ships) AS ships, MIN(s.started_at) AS first_at
  FROM ship_events e
  JOIN users u ON u.github_id = e.user_github_id
  JOIN sessions s ON s.id = e.session_id
  WHERE e.day >= '${day(start)}' AND e.day <= '${day(end)}'
  GROUP BY u.github_id
  ORDER BY ships DESC, first_at ASC
  LIMIT 3`;

const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'server');
const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'vibetime', '--remote', '--json', '--command', sql], {
  cwd: serverDir, encoding: 'utf8',
});
const rows = JSON.parse(out)[0].results;

// Same counting as countedShips in server/src/crews.ts: a ship counts in any
// week its author was a member, joining and leaving weeks included, and
// DISTINCT on the ship_events key stops a same-week rejoin counting twice.
// A crew needs two members in the week to be ranked, as on /crews.
const crewSql = `WITH spans AS (
    SELECT m.crew_id, m.user_github_id,
      date(m.joined_at, '-6 days', 'weekday 1') AS from_day,
      CASE WHEN m.left_at IS NULL THEN '9999-12-31' ELSE date(m.left_at, '-6 days', 'weekday 1', '+7 days') END AS to_day
    FROM crew_members m JOIN crews c ON c.id = m.crew_id
    WHERE c.deleted_at IS NULL
  ), counted AS (
    SELECT DISTINCT sp.crew_id, e.user_github_id, e.session_id, e.day, e.ships
    FROM spans sp JOIN ship_events e
      ON e.user_github_id = sp.user_github_id AND e.day >= sp.from_day AND e.day < sp.to_day
     AND e.day >= '${day(start)}' AND e.day <= '${day(end)}'
  )
  SELECT c.slug, c.name,
    (SELECT COUNT(*) FROM spans sp WHERE sp.crew_id = c.id AND sp.from_day <= '${day(end)}' AND sp.to_day > '${day(start)}') AS members,
    (SELECT COALESCE(SUM(ships), 0) FROM counted WHERE crew_id = c.id) AS ships
  FROM crews c WHERE c.deleted_at IS NULL
  ORDER BY ships DESC, c.created_at ASC`;
let topCrew = null;
try {
  const crewOut = execFileSync('npx', ['wrangler', 'd1', 'execute', 'vibetime', '--remote', '--json', '--command', crewSql], {
    cwd: serverDir, encoding: 'utf8',
  });
  topCrew = JSON.parse(crewOut)[0].results.find((c) => c.members >= 2 && c.ships > 0) ?? null;
} catch (e) {
  console.error(`  (top crew skipped: ${e instanceof Error ? e.message.split('\n')[0] : e})`);
}

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const label = (d) => `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
const range = `${label(start)} – ${label(end)}`;
const medals = ['🥇', '🥈', '🥉'];

console.log(`\n  ◆ vibe · weekly top shippers · ${range}${current ? ' (week still running)' : ''}\n`);
if (rows.length === 0) {
  console.log('  nothing shipped this week\n');
  process.exit(0);
}
const pad = Math.max(...rows.map((r) => r.handle.length));
rows.forEach((r, i) => console.log(`  ${medals[i]} @${r.handle.padEnd(pad)}  ${r.ships} ship${r.ships === 1 ? '' : 's'}`));
if (topCrew) console.log(`\n  top crew: ${topCrew.name} · ${topCrew.ships} ships · ${topCrew.members} members`);

console.log('\n  ── paste ─────────────────────────────\n');
console.log(`weekly top shippers on vibetime, ${range}\n`);
rows.forEach((r, i) => console.log(`${medals[i]} ${r.handle} · ${r.ships} ship${r.ships === 1 ? '' : 's'}`));
if (topCrew) console.log(`\ntop crew: ${topCrew.name} · ${topCrew.ships} ships`);
console.log(`\nvibetime.club/leaderboard`);
if (topCrew) console.log(`start a crew: vibetime.club/crews`);
console.log();

// While the week is running, the live /crews board must agree with this
// script. A mismatch means the two copies of the counting rule drifted.
if (current && topCrew) {
  try {
    const board = execFileSync('curl', ['-s', `https://vibetime.club/crews?v=${Date.now()}`], { encoding: 'utf8' });
    const live = new RegExp(`href="/crew/${topCrew.slug}"[\\s\\S]*?<td class="ships">(\\d+)<`).exec(board)?.[1];
    if (live !== undefined && Number(live) !== topCrew.ships) {
      console.error(`  ! top crew mismatch: this script says ${topCrew.ships}, vibetime.club/crews says ${live}\n`);
    }
  } catch { /* offline: nothing to compare against */ }
}

if (wantHtml) {
  // Same visual family as the vibe share card, staged for Twitter: near-16:9
  // card, the winner as the centered hero, runners-up clearly secondary.
  const avatarImg = (r, size) => r.avatar_url
    ? `<img src="${r.avatar_url}${r.avatar_url.includes('?') ? '&' : '?'}s=${size * 2}" width="${size}" height="${size}" style="border-radius:50%;display:block;">`
    : `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#1a1a1a;"></div>`;

  const winner = rows[0];
  const runners = rows.slice(1);

  const winnerBlock = `
  <div style="display:flex;flex-direction:column;align-items:center;margin:30px 0 36px;">
    <div style="position:relative;background:radial-gradient(circle,rgba(124,58,237,0.25) 0%,rgba(124,58,237,0) 70%);padding:26px 26px 18px;">
      <div style="border:3px solid #a78bfa;border-radius:50%;padding:4px;box-shadow:0 0 60px rgba(124,58,237,0.5);">${avatarImg(winner, 100)}</div>
      <div style="position:absolute;bottom:6px;right:2px;font-size:44px;line-height:1;filter:drop-shadow(0 3px 10px rgba(0,0,0,0.7));">🥇</div>
    </div>
    <div style="color:#fff;font-size:34px;font-weight:600;margin-top:10px;">${winner.handle}</div>
    <div style="margin-top:8px;"><span style="color:#a78bfa;font-size:36px;font-weight:700;">${winner.ships}</span> <span style="color:#777;font-size:16px;">ship${winner.ships === 1 ? '' : 's'} this week</span></div>
  </div>`;

  const runnersBlock = runners.length === 0 ? '' : `
  <div style="display:flex;gap:16px;">
    ${runners.map((r, i) => `
    <div style="flex:1;display:flex;align-items:center;gap:14px;background:#111;border:1px solid #1c1c1c;border-radius:12px;padding:16px 22px;">
      <div style="font-size:30px;line-height:1;">${medals[i + 1]}</div>
      ${avatarImg(r, 44)}
      <div style="flex:1;color:#ddd;font-size:17px;">${r.handle}</div>
      <div style="color:#a78bfa;font-size:20px;font-weight:600;">${r.ships}<span style="color:#666;font-size:12px;font-weight:400;"> ship${r.ships === 1 ? '' : 's'}</span></div>
    </div>`).join('')}
  </div>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>vibe · top shippers</title></head>
<body style="margin:0;background:#0a0a0a;display:flex;justify-content:center;align-items:center;min-height:100vh;">
<div style="width:1000px;background:linear-gradient(180deg,#0f0d16 0%,#0d0d0d 45%);border:1px solid #1c1c1c;border-radius:16px;padding:44px 56px 40px;font-family:'SF Mono','Fira Code','Consolas',monospace;">
  <div style="display:flex;justify-content:space-between;align-items:baseline;">
    <div style="color:#a78bfa;font-size:17px;">◆ vibe <span style="color:#555;">·</span> <span style="color:#e5e5e5;">top shippers</span></div>
    <div style="color:#666;font-size:14px;">${range}</div>
  </div>
  ${winnerBlock}
  ${runnersBlock}
  ${topCrew ? `<div style="display:flex;justify-content:center;align-items:center;gap:10px;margin-top:28px;color:#888;font-size:15px;"><span style="color:#555;">top crew</span><span style="color:#e5e5e5;">${topCrew.name.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))}</span><span style="color:#a78bfa;font-weight:600;">${topCrew.ships}</span><span style="color:#666;font-size:12px;">ships</span></div>` : ''}
  <div style="color:#555;font-size:13px;margin-top:${topCrew ? 18 : 36}px;text-align:center;">vibetime.club/leaderboard</div>
</div>
</body></html>`;

  const dir = process.env.VIBE_DIR || join(homedir(), '.vibe');
  mkdirSync(dir, { recursive: true });
  const outPath = join(dir, 'top3-card.html');
  writeFileSync(outPath, html);
  console.log(`  ◆ card: ${outPath}\n`);
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(opener, [outPath], { detached: true, stdio: 'ignore' }).unref();
}
