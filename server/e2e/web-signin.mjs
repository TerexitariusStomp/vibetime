// Drives the web sign-in against a local worker and a stand-in GitHub.
//
//   node e2e/web-signin.mjs <worker-port> <github-stub-port> <persist-dir> [<signin-off-port>]
//
// Start the worker from server/ with sign-in pointed at the stub. --local-upstream
// makes the worker see the address the test calls, or every start redirects to
// the canonical origin:
//   npx wrangler dev --port <worker-port> --inspector-port <free> --local-upstream 127.0.0.1:<worker-port> --persist-to <persist-dir> \
//     --var GITHUB_CLIENT_SECRET:test-secret --var WEB_ORIGIN:http://127.0.0.1:<worker-port> \
//     --var GITHUB_WEB_BASE:http://127.0.0.1:<github-stub-port> --var GITHUB_API_BASE:http://127.0.0.1:<github-stub-port>
// The optional fourth port is a second worker started without GITHUB_CLIENT_SECRET.
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const [port, ghPort, persist, offPort] = process.argv.slice(2);
const BASE = `http://127.0.0.1:${port}`;
const run = randomUUID().slice(0, 8);

const users = new Map();
const github = createServer((req, res) => {
  let body = '';
  req.on('data', (d) => (body += d)).on('end', () => {
    const send = (status, obj) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.method === 'POST' && req.url === '/login/oauth/access_token') {
      const b = JSON.parse(body || '{}');
      if (b.client_secret !== 'test-secret') return send(200, { error: 'incorrect_client_credentials' });
      if (b.redirect_uri !== `${BASE}/auth/github/callback`) return send(200, { error: 'redirect_uri_mismatch' });
      if (b.code === 'bad') return send(200, { error: 'bad_verification_code' });
      return send(200, { access_token: `tok-${b.code}`, token_type: 'bearer', scope: '' });
    }
    if (req.method === 'GET' && req.url === '/user') {
      const code = (req.headers.authorization ?? '').replace('Bearer tok-', '');
      if (code === 'nouser') return send(401, { message: 'Bad credentials' });
      if (!users.has(code)) users.set(code, { id: 880_000_000 + users.size + Math.floor(Math.random() * 1_000_000), login: `web-${run}-${code}`, avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4' });
      return send(200, users.get(code));
    }
    send(404, { message: 'Not Found' });
  });
});
await new Promise((r) => github.listen(Number(ghPort), '127.0.0.1', r));

async function req(path, opts = {}, base = BASE) {
  for (let i = 0; i < 4; i++) {
    try {
      return await fetch(`${base}${path}`, { redirect: 'manual', ...opts, headers: { connection: 'close', ...(opts.headers ?? {}) } });
    } catch (e) { if (i === 3) throw e; await new Promise((r) => setTimeout(r, 300)); }
  }
}
const cookiesOf = (res) => res.headers.getSetCookie();
const cookieValue = (res, name) => {
  const c = cookiesOf(res).find((x) => x.startsWith(`${name}=`));
  return c ? c.slice(name.length + 1).split(';')[0] : null;
};
const d1 = (sql) => JSON.parse(execFileSync('npx', ['wrangler', 'd1', 'execute', 'vibetime', '--local', '--persist-to', persist, '--command', sql, '--json'],
  { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }))[0].results;

let failed = 0;
function check(name, ok, detail = '') {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : `\n     ${detail}`}`);
}

async function startSignIn(next = '/leaderboard') {
  const res = await req(`/auth/github/start?next=${encodeURIComponent(next)}`);
  const loc = new URL(res.headers.get('location'));
  return { res, loc, state: loc.searchParams.get('state'), stateCookie: cookieValue(res, 'vt_oauth') };
}
async function signIn(code, next = '/leaderboard') {
  const { state, stateCookie } = await startSignIn(next);
  const res = await req(`/auth/github/callback?code=${code}&state=${state}`, { headers: { cookie: `vt_oauth=${stateCookie}` } });
  return { res, session: cookieValue(res, 'vt_session') };
}

{
  const res = await req('/leaderboard');
  const body = await res.text();
  check('signed out: the bar offers sign in and the page stays publicly cacheable',
    res.status === 200 && body.includes('href="/auth/github/start?next=%2Fleaderboard"') && !body.includes('sign out')
      && res.headers.get('cache-control') === 'public, max-age=60' && res.headers.get('vary') === 'cookie',
    `${res.status} ${res.headers.get('cache-control')}`);
}
{
  const { res, loc, state, stateCookie } = await startSignIn('/@someone');
  const setCookie = cookiesOf(res).join(' | ');
  check('start sends you to GitHub with the client id, the callback and a state',
    res.status === 302 && loc.pathname === '/login/oauth/authorize' && loc.searchParams.get('redirect_uri') === `${BASE}/auth/github/callback`
      && !!loc.searchParams.get('client_id') && !loc.searchParams.has('scope') && state?.length >= 40,
    loc.toString());
  check('the state cookie is HttpOnly, short-lived, scoped to the callback and remembers where you were',
    /HttpOnly/.test(setCookie) && /Path=\/auth\/github/.test(setCookie) && /Max-Age=600/.test(setCookie)
      && stateCookie?.startsWith(`${state}.`) && decodeURIComponent(stateCookie.slice(state.length + 1)) === '/@someone',
    setCookie);
}
for (const evil of ['//evil.example/x', 'https://evil.example', '/\\evil.example']) {
  const { state, stateCookie } = await startSignIn(evil);
  check(`next=${evil} cannot leave the site`, decodeURIComponent(stateCookie.slice(state.length + 1)) === '/leaderboard', stateCookie);
}
{
  const { state, stateCookie } = await startSignIn('/@ü-日本');
  const res = await req(`/auth/github/callback?code=uni&state=${state}`, { headers: { cookie: `vt_oauth=${stateCookie}` } });
  check('a non-ASCII next still finishes sign-in on a safe page', res.status === 302 && res.headers.get('location') === '/leaderboard' && !!cookieValue(res, 'vt_session'),
    `${res.status} ${res.headers.get('location')}`);
  const out = await req('/auth/signout', { method: 'POST', headers: { origin: BASE, 'content-type': 'application/x-www-form-urlencoded' }, body: `next=${encodeURIComponent('/日本')}` });
  check('a non-ASCII next on sign-out still signs out', out.status === 303 && out.headers.get('location') === '/leaderboard', `${out.status} ${out.headers.get('location')}`);
}
{
  const res = await req('/auth/github/callback?code=x&state=whatever');
  check('callback without the state cookie is refused with a page, not a session', res.status === 400 && !cookieValue(res, 'vt_session'));
  const { stateCookie } = await startSignIn();
  const res2 = await req('/auth/github/callback?code=x&state=forged', { headers: { cookie: `vt_oauth=${stateCookie}` } });
  check('callback with a different state is refused', res2.status === 400 && !cookieValue(res2, 'vt_session'));
}
{
  const { state, stateCookie } = await startSignIn('/leaderboard?window=month');
  const res = await req(`/auth/github/callback?error=access_denied&state=${state}`, { headers: { cookie: `vt_oauth=${stateCookie}` } });
  check('cancelling on GitHub goes back where you were, signed out',
    res.status === 302 && res.headers.get('location') === '/leaderboard?window=month' && !cookieValue(res, 'vt_session'));
}
{
  const { res } = await signIn('bad');
  check('a rejected code shows a retry page and signs nobody in', res.status === 502 && !cookieValue(res, 'vt_session') && (await res.text()).includes('try again'));
  const { res: r2 } = await signIn('nouser');
  check('GitHub refusing /user shows a retry page and signs nobody in', r2.status === 502 && !cookieValue(r2, 'vt_session'));
}

const { res: inRes, session } = await signIn('alice', '/leaderboard?window=all');
const sessionCookie = cookiesOf(inRes).find((c) => c.startsWith('vt_session=')) ?? '';
check('sign-in lands back on the page you started from with a 30-day session cookie',
  inRes.status === 302 && inRes.headers.get('location') === '/leaderboard?window=all' && session?.length >= 40
    && /HttpOnly/.test(sessionCookie) && /SameSite=Lax/.test(sessionCookie) && /Secure/.test(sessionCookie) && /Max-Age=2592000/.test(sessionCookie),
  `${inRes.status} ${inRes.headers.get('location')} ${sessionCookie}`);
const alice = users.get('alice');
{
  const rows = d1(`SELECT handle FROM users WHERE github_id = ${alice.id}`);
  const stored = d1(`SELECT COUNT(*) n FROM web_sessions WHERE user_github_id = ${alice.id} AND token_hash != '${session}'`);
  check('the user row exists and only a hash of the token is stored', rows[0]?.handle === alice.login && stored[0].n === 1);
}
{
  const res = await req('/leaderboard', { headers: { cookie: `vt_session=${session}` } });
  const body = await res.text();
  check('signed in: the bar shows you, offers sign out, and the page is never cached',
    body.includes(`href="/@${alice.login}"`) && body.includes('sign out') && !body.includes('/auth/github/start')
      && res.headers.get('cache-control') === 'private, no-store',
    res.headers.get('cache-control'));
  const p = await req(`/@${alice.login}`, { headers: { cookie: `vt_session=${session}` } });
  const pb = await p.text();
  check('your own profile renders with the bar', p.status === 200 && pb.includes('sign out') && p.headers.get('cache-control') === 'private, no-store');
  const nf = await req('/@nobody-here-zz', { headers: { cookie: `vt_session=${session}` } });
  check('a missing profile keeps the bar and its 404', nf.status === 404 && (await nf.text()).includes('sign out'));
}
{
  const res = await req('/leaderboard', { headers: { cookie: `vt_session=${'x'.repeat(43)}` } });
  const body = await res.text();
  check('an unknown cookie reads as signed out', res.status === 200 && body.includes('/auth/github/start') && res.headers.get('cache-control') === 'public, max-age=60');
  const res2 = await req('/leaderboard', { headers: { cookie: 'vt_session=%%%; other=1' } });
  check('a mangled cookie header still renders the page', res2.status === 200);
}
{
  const { session: s2 } = await signIn('bob');
  const bob = users.get('bob');
  d1(`UPDATE web_sessions SET expires_at = '2000-01-01T00:00:00.000Z' WHERE user_github_id = ${bob.id}`);
  const res = await req('/leaderboard', { headers: { cookie: `vt_session=${s2}` } });
  check('an expired session reads as signed out', (await res.text()).includes('/auth/github/start'));
}
{
  const evil = await req('/auth/signout', { method: 'POST', headers: { cookie: `vt_session=${session}`, origin: 'https://evil.example', 'content-type': 'application/x-www-form-urlencoded' }, body: 'next=%2Fleaderboard' });
  const still = await (await req('/leaderboard', { headers: { cookie: `vt_session=${session}` } })).text();
  check('a cross-site sign-out is refused and the session survives', evil.status === 403 && still.includes('sign out'));
  const noOrigin = await req('/auth/signout', { method: 'POST', headers: { cookie: `vt_session=${session}`, 'content-type': 'application/x-www-form-urlencoded' }, body: 'next=%2Fleaderboard' });
  check('a sign-out with no origin at all is refused', noOrigin.status === 403);

  const out = await req('/auth/signout', { method: 'POST', headers: { cookie: `vt_session=${session}`, origin: BASE, 'content-type': 'application/x-www-form-urlencoded' }, body: `next=${encodeURIComponent(`/@${alice.login}`)}` });
  const cleared = cookiesOf(out).find((c) => c.startsWith('vt_session=')) ?? '';
  const after = await (await req('/leaderboard', { headers: { cookie: `vt_session=${session}` } })).text();
  check('sign out returns to the page, clears the cookie and kills the session server side',
    out.status === 303 && out.headers.get('location') === `/@${alice.login}` && /Max-Age=0/.test(cleared) && after.includes('/auth/github/start'),
    `${out.status} ${out.headers.get('location')} ${cleared}`);
}
{
  const { session: again } = await signIn('alice');
  const rows = d1(`SELECT COUNT(*) n FROM users WHERE github_id = ${alice.id}`);
  check('signing in again reuses the same user row', !!again && rows[0].n === 1);
}

{
  const res = await req('/auth/exchange', { method: 'POST', headers: { 'content-type': 'application/json', 'x-cli-version': '0.14.1' }, body: JSON.stringify({ github_access_token: 'tok-carol' }) });
  const body = await res.json();
  const carol = users.get('carol');
  const rows = carol ? d1(`SELECT handle, avatar_url FROM users WHERE github_id = ${carol.id}`) : [];
  check('the CLI login still issues a token pair and writes the same user row',
    res.status === 200 && typeof body.jwt === 'string' && typeof body.refreshToken === 'string' && body.handle === carol?.login
      && rows[0]?.handle === carol?.login && rows[0]?.avatar_url === carol?.avatar_url,
    `${res.status} ${JSON.stringify(body).slice(0, 120)}`);
}

if (offPort) {
  const off = `http://127.0.0.1:${offPort}`;
  const lb = await (await req('/leaderboard', {}, off)).text();
  const start = await req('/auth/github/start', {}, off);
  const withCookie = await (await req('/leaderboard', { headers: { cookie: `vt_session=${'y'.repeat(43)}` } }, off)).text();
  check('without the client secret there is no sign-in button and the routes are 404',
    !lb.includes('sign in') && !lb.includes('/auth/github/start') && start.status === 404 && !withCookie.includes('sign out'));
}

github.close();
console.log(failed === 0 ? '\nall passed' : `\n${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
