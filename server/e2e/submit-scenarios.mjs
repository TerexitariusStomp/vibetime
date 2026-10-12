// Ship-counting scenarios for POST /sessions, run against a local worker.
//
//   npx wrangler d1 migrations apply vibetime --local --persist-to <dir>
//   npx wrangler dev --local --persist-to <dir> --port <port> --inspector-port <other>
//   node e2e/submit-scenarios.mjs <port> <dir>
//
// Run it against main's worker and a branch's worker and compare: a change to
// counting must move only the lines it means to. It reads JWT_SECRET from
// .dev.vars, and the commit-fact cases expect COMMIT_KEY_SECRET there too.
// Each scenario gets its own fresh user, so rows from earlier runs never mix in.
import { randomUUID, createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [port, persist] = process.argv.slice(2);
if (!port || !persist) {
  console.error('usage: node e2e/submit-scenarios.mjs <port> <persist-dir>');
  process.exit(1);
}
const serverDir = new URL('..', import.meta.url).pathname;
const secret = readFileSync(new URL('../.dev.vars', import.meta.url), 'utf-8').match(/^JWT_SECRET=(.*)$/m)?.[1]?.replace(/"/g, '');
const b64u = (s) => Buffer.from(s).toString('base64url');

function jwt(sub) {
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64u(JSON.stringify({ sub, handle: `u${sub}`, iat: 0, exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `${h}.${p}.${createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url')}`;
}

function d1(sql) {
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'vibetime', '--local', '--persist-to', persist, '--command', sql, '--json'],
    { cwd: serverDir, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
  return JSON.parse(out)[0].results;
}

// Miniflare drops keep-alive connections under rapid sequential posts, so
// close each one and retry, or a passing worker reports as a failing one.
async function post(sub, cli, session) {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt(sub)}`, 'x-cli-version': cli, connection: 'close' },
        body: JSON.stringify(session),
      });
      const body = await res.json();
      if (res.status !== 200) throw new Error(`status ${res.status}: ${JSON.stringify(body)}`);
      return body;
    } catch (e) {
      if (i === 3) throw e;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}

const today = new Date().toISOString().slice(0, 10);
const iso = (minsAgo) => new Date(Date.now() - minsAgo * 60_000).toISOString();
const hex = () => randomUUID().replace(/-/g, '');
const B = 'b'.repeat(16);
const C = 'c'.repeat(16);

function session(project, start, end, over = {}) {
  return {
    id: randomUUID(), tool: 'claude', projectHash: project, branchHash: B,
    startedAt: iso(start), endedAt: iso(end), durationSeconds: 600, shipEvents: [today], ...over,
  };
}
const stats = (commits, linesAdded = commits * 60) => ({ commits, linesAdded, linesRemoved: 0, filesTouched: commits });

const fact = (lines, over = {}) => ({
  id: hex(), authorId: hex(), treeId: hex(), committedAt: Math.floor(Date.now() / 1000) - 600,
  linesAdded: lines, linesRemoved: 0, files: 1, ...over,
});
const withFacts = (facts) => ({
  commits: facts.length, linesAdded: facts.reduce((n, f) => n + f.linesAdded, 0), linesRemoved: 0, filesTouched: facts.length,
  commitKeyVersion: 1, commitFacts: facts,
});

let failures = 0;
async function scenario(name, expected, run) {
  const sub = 9_000_000 + Math.floor(Math.random() * 900_000);
  d1(`INSERT INTO users (github_id, handle, created_at, last_seen_at) VALUES (${sub}, 'u${sub}', '${iso(0)}', '${iso(0)}')`);
  const note = await run((cli, s) => post(sub, cli, s), hex(), sub);
  const [{ ships }] = d1(`SELECT COALESCE(SUM(ships), 0) AS ships FROM ship_events WHERE user_github_id = ${sub}`);
  const ok = ships === expected;
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(74)} ships=${ships}${ok ? '' : ` expected ${expected}`}${note ? `  ${note}` : ''}`);
}

// Identical twins from CLIs without commit facts: each state is paid once.
await scenario('twins: two overlapping sessions, one state', 1, async (send, p) => {
  await send('0.13.1', { ...session(p, 60, 1), ...stats(5) });
  await send('0.13.1', { ...session(p, 50, 1), ...stats(5) });
});
await scenario('twins: growing together through two states', 2, async (send, p) => {
  const a = session(p, 60, 1), b = session(p, 50, 1);
  await send('0.13.1', { ...a, ...stats(5) }); await send('0.13.1', { ...b, ...stats(5) });
  await send('0.13.1', { ...b, ...stats(8) }); await send('0.13.1', { ...a, ...stats(8) });
});
await scenario('twins: old open-hook shape (endedAt = startedAt), three states', 3, async (send, p) => {
  const a = session(p, 120, 120), b = session(p, 110, 110);
  for (const c of [2, 4, 6]) { await send('0.13.1', { ...a, ...stats(c) }); await send('0.13.1', { ...b, ...stats(c) }); }
});
await scenario('twins: identical stats but sessions do not overlap', 2, async (send, p) => {
  await send('0.13.1', { ...session(p, 300, 240), ...stats(5) });
  await send('0.13.1', { ...session(p, 60, 1), ...stats(5) });
});
await scenario('twins: identical stats in different projects', 2, async (send, p) => {
  await send('0.13.1', { ...session(p, 60, 1), ...stats(5) });
  await send('0.13.1', { ...session(hex(), 50, 1), ...stats(5) });
});

// Live sessions on one branch from CLIs without commit facts: nested counts of
// the same commits are paid like one session.
await scenario('branch: three live sessions, nested counts, three rounds', 3, async (send, p) => {
  const a = session(p, 120, 0), b = session(p, 90, 0), c = session(p, 60, 0);
  for (const [x, y, z] of [[10, 8, 5], [12, 10, 7], [14, 12, 9]]) {
    await send('0.13.1', { ...a, ...stats(x) }); await send('0.13.1', { ...b, ...stats(y) }); await send('0.13.1', { ...c, ...stats(z) });
  }
});
await scenario('branch: lone session, three rounds', 3, async (send, p) => {
  const a = session(p, 120, 0);
  for (const c of [10, 12, 14]) await send('0.13.1', { ...a, ...stats(c) });
});
await scenario('branch: a new session after the other ended', 2, async (send, p) => {
  await send('0.13.1', { ...session(p, 300, 240), ...stats(5) });
  await send('0.13.1', { ...session(p, 60, 0), ...stats(4) });
});
await scenario('branch: two live sessions on different branches', 2, async (send, p) => {
  await send('0.13.1', { ...session(p, 120, 0), ...stats(10) });
  await send('0.13.1', { ...session(p, 90, 0, { branchHash: C }), ...stats(8) });
});
await scenario('branch: no branch hash (CLI before 0.13)', 2, async (send, p) => {
  await send('0.12.0', { ...session(p, 120, 0, { branchHash: undefined }), ...stats(10) });
  await send('0.12.0', { ...session(p, 90, 0, { branchHash: undefined }), ...stats(8) });
});

// Commit facts (0.14): each piece of work counts once across sessions,
// machines and rewrites.
await scenario('facts: the same two commits from a second machine', 1, async (send, p) => {
  const f = [fact(60), fact(60)];
  await send('0.14.1', { ...session(p, 60, 1), ...withFacts(f) });
  await send('0.14.1', { ...session(p, 600, 540, { branchHash: C }), ...withFacts(f) });
});
await scenario('facts: second machine has the same two plus one new', 2, async (send, p) => {
  const x = fact(60), y = fact(60), z = fact(60);
  await send('0.14.1', { ...session(p, 60, 1), ...withFacts([x, y]) });
  const b = session(p, 600, 540, { branchHash: C });
  await send('0.14.1', { ...b, ...withFacts([x, y]) });
  await send('0.14.1', { ...b, ...withFacts([x, y, z]) });
});
await scenario('facts: a session resubmitting its own commits is not docked', 2, async (send, p) => {
  const x = fact(60), y = fact(60), a = session(p, 60, 1);
  await send('0.14.1', { ...a, ...withFacts([x]) });
  await send('0.14.1', { ...a, ...withFacts([x, y]) });
});
await scenario('facts: malformed facts are ignored and the totals scored', 1, async (send, p) => {
  const s = { ...session(p, 60, 1), ...withFacts([fact(60)]) };
  s.commitFacts[0].id = 'not-hex';
  await send('0.14.1', s);
});
await scenario('facts: the key is issued on submit and stable per account', 0, async (send, p) => {
  const one = await send('0.14.1', { ...session(p, 60, 1), ...withFacts([fact(10)]) });
  const two = await send('0.14.1', { ...session(p, 60, 1), ...withFacts([fact(10)]) });
  if (!one.commitKey) { failures++; return 'FAIL: no key (is COMMIT_KEY_SECRET in .dev.vars?)'; }
  return `key stable=${one.commitKey === two.commitKey}`;
});
await scenario('facts: a rebased copy from another machine', 1, async (send, p) => {
  const x = fact(60);
  await send('0.14.1', { ...session(p, 60, 1), ...withFacts([x]) });
  await send('0.14.1', { ...session(p, 600, 540, { branchHash: C }), ...withFacts([{ ...x, id: hex(), treeId: hex() }]) });
});
await scenario('facts: the owner rebases its own work after a copy elsewhere', 1, async (send, p) => {
  const x = fact(60), a = session(p, 60, 1);
  await send('0.14.1', { ...a, ...withFacts([x]) });
  const rebased = { ...x, id: hex(), treeId: hex() };
  await send('0.14.1', { ...session(p, 600, 540, { branchHash: C }), ...withFacts([rebased]) });
  await send('0.14.1', { ...a, ...withFacts([rebased]) });
  const [row] = d1(`SELECT commits FROM sessions WHERE id = '${a.id}'`);
  return `owner keeps it: commits=${row.commits}`;
});
await scenario('facts: two different commits in the same author second', 2, async (send, p) => {
  const authorId = hex();
  await send('0.14.1', { ...session(p, 60, 1), ...withFacts([fact(60, { authorId })]) });
  await send('0.14.1', { ...session(p, 50, 1, { branchHash: C }), ...withFacts([fact(70, { authorId })]) });
});
await scenario('facts: squash of an up-to-date branch, another session', 1, async (send, p) => {
  const x1 = fact(60), x2 = fact(60);
  await send('0.14.1', { ...session(p, 60, 1), ...withFacts([x1, x2]) });
  await send('0.14.1', { ...session(p, 50, 1, { branchHash: C }), ...withFacts([fact(120, { treeId: x2.treeId, committedAt: x2.committedAt + 300 })]) });
});
await scenario('facts: squash pulled back into the branch session', 1, async (send, p) => {
  const x1 = fact(60), x2 = fact(60), a = session(p, 60, 1);
  await send('0.14.1', { ...a, ...withFacts([x1, x2]) });
  await send('0.14.1', { ...a, ...withFacts([x1, x2, fact(120, { treeId: x2.treeId, committedAt: x2.committedAt + 300 })]) });
});
await scenario('facts: an older commit sharing a later tree is not the copy', 2, async (send, p) => {
  const later = fact(60);
  await send('0.14.1', { ...session(p, 60, 1), ...withFacts([later]) });
  await send('0.14.1', { ...session(p, 50, 1, { branchHash: C }), ...withFacts([fact(60, { treeId: later.treeId, committedAt: later.committedAt - 300 })]) });
});
await scenario('facts: two live sessions on one branch, distinct commits', 2, async (send, p) => {
  await send('0.14.1', { ...session(p, 120, 0), ...withFacts([fact(60), fact(60)]) });
  await send('0.14.1', { ...session(p, 90, 0), ...withFacts([fact(60), fact(60)]) });
});

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
