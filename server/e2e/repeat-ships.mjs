// Ships paid twice for the same commits, against a local worker.
//   npx wrangler dev --port <port> --persist-to <dir>      (from server/, migrations applied)
//   node e2e/repeat-ships.mjs <port> <persist-dir>
import { execFileSync } from 'node:child_process';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const [port, persist] = process.argv.slice(2);
if (!port || !persist) { console.error('usage: node e2e/repeat-ships.mjs <port> <persist-dir>'); process.exit(2); }
const base = `http://127.0.0.1:${port}`;
const secret = /^JWT_SECRET=(.*)$/m.exec(readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8'))[1].replace(/^"|"$/g, '');
const d1 = (sql) => JSON.parse(execFileSync('npx', ['wrangler', 'd1', 'execute', 'vibetime', '--local', '--persist-to', persist, '--command', sql, '--json'],
  { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }))[0].results;

const hex = () => randomBytes(16).toString('hex');
const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400e3).toISOString().slice(0, 10);

function person() {
  const id = 800000 + Math.floor(Math.random() * 99999);
  d1(`INSERT INTO users (github_id, handle, created_at, last_seen_at) VALUES (${id}, 'r${id}', '2026-01-01', '2026-01-01')`);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: id, handle: `r${id}`, iat: now, exp: now + 3600 })}`;
  return { id, jwt: `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}` };
}

const commit = (lines = 60) => ({ id: hex(), authorId: hex(), treeId: hex(), committedAt: Math.floor(Date.now() / 1000), linesAdded: lines, linesRemoved: 0, files: 2 });

function session(who, project = hex().slice(0, 12)) {
  const id = randomUUID();
  const startedAt = new Date(Date.now() - 2 * 86400e3).toISOString();
  return async ({ commits, facts, days = [today] }) => {
    const n = facts ? facts.length : commits;
    const lines = facts ? facts.reduce((a, f) => a + f.linesAdded, 0) : n * 60;
    const body = {
      id, tool: 'claude', projectHash: project, startedAt, endedAt: new Date().toISOString(), durationSeconds: 3600,
      commits: n, linesAdded: lines, linesRemoved: 0, filesTouched: n * 2, shipEvents: n ? days : [],
      ...(facts?.length ? { commitKeyVersion: 1, commitFacts: facts } : {}),
    };
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await fetch(`${base}/sessions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${who.jwt}`, connection: 'close' }, body: JSON.stringify(body) });
        if (res.status !== 200) throw new Error(`submit ${res.status} ${await res.text()}`);
        return;
      } catch (e) {
        if (attempt >= 3 || String(e).includes('submit 4')) throw e;
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  };
}
const shipsOf = (who) => d1(`SELECT COALESCE(SUM(ships), 0) AS n FROM ship_events WHERE user_github_id = ${who.id}`)[0].n;

let failed = 0;
function check(name, got, want) {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` (got ${got}, want ${want})`}`);
}

{
  const who = person(), submit = session(who);
  const work = [commit(), commit()];
  await submit({ facts: work });
  await submit({ facts: work.slice(0, 1) });
  await submit({ facts: work });
  await submit({ facts: work.slice(1) });
  await submit({ facts: work });
  check('commits that leave the range and come back are not paid again', await shipsOf(who), 1);
  await submit({ facts: [...work, commit()] });
  check('a new commit after they come back is paid', await shipsOf(who), 2);
}
{
  const who = person(), submit = session(who);
  const work = [commit(), commit()];
  await submit({ facts: work });
  await submit({ commits: 5 });
  await submit({ facts: work });
  await submit({ commits: 6 });
  check('an older CLI taking turns on a tracked session is not paid for the same work', await shipsOf(who), 1);
}
{
  const who = person(), submit = session(who);
  const first = [commit(), commit()];
  await submit({ facts: first });
  await submit({ facts: first.slice(0, 1) });
  await submit({ facts: [first[0], commit(), commit()] });
  check('new commits after a worktree is removed are paid', await shipsOf(who), 2);
}
{
  const who = person(), submit = session(who);
  await submit({ commits: 2 });
  await submit({ commits: 4 });
  check('a CLI without the ledger is scored on its totals as before', await shipsOf(who), 2);
}
{
  const who = person(), submit = session(who);
  await submit({ facts: [commit(), commit()], days: [yesterday, today] });
  check('two days caught up in one submit with two new commits are both paid', await shipsOf(who), 2);
}
{
  const who = person(), submit = session(who);
  const work = [commit(), commit()];
  await submit({ facts: work });
  const more = [...work, commit()];
  await Promise.all([submit({ facts: more }), submit({ facts: more }), submit({ facts: more })]);
  check('three identical submits at once pay the new commit once', await shipsOf(who), 2);
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
