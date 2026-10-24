// Drives crews end to end against a local worker and a stand-in GitHub.
//
//   node e2e/crews.mjs <worker-port> <github-stub-port> <persist-dir>
//
// Start the worker exactly as for e2e/web-signin.mjs, with migrations through
// 0011 applied to <persist-dir>.
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const [port, ghPort, persist] = process.argv.slice(2);
const BASE = `http://127.0.0.1:${port}`;
const run = randomUUID().slice(0, 6);

const ghUsers = new Map();
const github = createServer((req, res) => {
  let body = '';
  req.on('data', (d) => (body += d)).on('end', () => {
    const send = (obj) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.url === '/login/oauth/access_token') return send({ access_token: `tok-${JSON.parse(body).code}` });
    const code = (req.headers.authorization ?? '').replace('Bearer tok-', '');
    if (!ghUsers.has(code)) ghUsers.set(code, { id: 770_000_000 + Math.floor(Math.random() * 100_000_000), login: `c${run}-${code}`, avatar_url: null });
    send(ghUsers.get(code));
  });
});
await new Promise((r) => github.listen(Number(ghPort), '127.0.0.1', r));

async function req(path, opts = {}) {
  for (let i = 0; i < 4; i++) {
    try {
      return await fetch(`${BASE}${path}`, { redirect: 'manual', ...opts, headers: { connection: 'close', ...(opts.headers ?? {}) } });
    } catch (e) { if (i === 3) throw e; await new Promise((r) => setTimeout(r, 300)); }
  }
}
const d1 = (sql) => JSON.parse(execFileSync('npx', ['wrangler', 'd1', 'execute', 'vibetime', '--local', '--persist-to', persist, '--command', sql, '--json'],
  { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }))[0].results;

async function signIn(name) {
  const start = await req('/auth/github/start?next=%2Fcrews');
  const state = new URL(start.headers.get('location')).searchParams.get('state');
  const oauth = start.headers.getSetCookie()[0].split(';')[0];
  const cb = await req(`/auth/github/callback?code=${name}&state=${state}`, { headers: { cookie: oauth } });
  const token = cb.headers.getSetCookie().find((c) => c.startsWith('vt_session=')).split(';')[0];
  const u = ghUsers.get(name);
  const user = { name, id: u.id, handle: u.login, cookie: token };
  user.get = (path) => req(path, { headers: { cookie: token } });
  user.post = (path, form = {}, origin = BASE) => req(path, {
    method: 'POST', headers: { cookie: token, origin, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form).toString(),
  });
  return user;
}
const loc = (res) => res.headers.get('location');
const today = new Date().toISOString().slice(0, 10);
const monday = (() => { const d = new Date(); const back = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - back); return d.toISOString().slice(0, 10); })();
const daysBefore = (day, n) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
function ships(user, day, n) {
  d1(`INSERT INTO ship_events (session_id, user_github_id, day, ships) VALUES ('${user.sid ?? randomUUID()}', ${user.id}, '${day}', ${n})`);
}
const crewIdOf = (slug) => d1(`SELECT id FROM crews WHERE slug = '${slug}' AND deleted_at IS NULL`)[0]?.id;
const inviteOf = (slug) => d1(`SELECT invite_code FROM crews WHERE slug = '${slug}' AND deleted_at IS NULL`)[0]?.invite_code;
const liveMembers = (slug) => d1(`SELECT COUNT(*) n FROM crew_members m JOIN crews c ON c.id = m.crew_id WHERE c.slug = '${slug}' AND c.deleted_at IS NULL AND m.left_at IS NULL`)[0].n;
const shipsOn = (html) => Number((/<div class="v">(\d+)<\/div><div class="l">ships/.exec(html) ?? [])[1]);

let failed = 0;
function check(name, ok, detail = '') {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : `\n     ${detail}`}`);
}

const anon = { get: (p) => req(p) };
{
  const res = await anon.get('/crews');
  const body = await res.text();
  check('signed out: /crews renders, links crews in the bar, and "start a crew" goes through sign-in',
    res.status === 200 && body.includes('href="/crews" class="on"') && body.includes('/auth/github/start?next=%2Fcrews%2Fnew'));
  const nw = await anon.get('/crews/new');
  check('signed out: /crews/new sends you to sign in first', nw.status === 303 && loc(nw).includes('/auth/github/start?next=%2Fcrews%2Fnew'));
}

const ada = await signIn('ada');
const bo = await signIn('bo');
const cy = await signIn('cy');
const crewName = `Lagos Crew ${run}`;
const slug = `lagos-crew-${run}`;

{
  const bad = await ada.post('/crews', { name: 'x' });
  check('a one-letter name is refused on the form, with no crew made', bad.status === 200 && (await bad.text()).includes('between 2 and 32') && !d1(`SELECT 1 FROM crews WHERE owner_github_id = ${ada.id}`).length);
  const res = await ada.post('/crews', { name: `  ${crewName}  ` });
  check('starting a crew lands on its page with a welcome', res.status === 303 && loc(res) === `/crew/${slug}?m=created`, `${res.status} ${loc(res)}`);
  const page = await (await ada.get(`/crew/${slug}`)).text();
  check('the owner sees the invite link and owner tools, and the crew starts invite only',
    page.includes(`/join/${inviteOf(slug)}`) && page.includes('open to anyone') && page.includes('delete crew') && !page.includes('<span class="tag tag-open">'));
  const board = await (await anon.get('/crews')).text();
  const soloRow = new RegExp(`<td class="rank">–</td>\\s*<td><a class="who" href="/crew/${slug}"[\\s\\S]*?needs 1 more member to rank`);
  check('a crew of one is listed on the board, unranked, saying what it needs', soloRow.test(board));
  const dup = await bo.post('/crews', { name: crewName });
  check('the same name again gets its own address', dup.status === 303 && loc(dup).startsWith(`/crew/${slug}-`) && loc(dup) !== `/crew/${slug}?m=created`, loc(dup));
  const reserved = await bo.post('/crews', { name: 'new' });
  check('a reserved word cannot take over a route', loc(reserved) === '/crew/new-crew?m=created' || /^\/crew\/new-crew-/.test(loc(reserved)), loc(reserved));
  const xss = await cy.post('/crews', { name: '<script>x</script>' });
  const xpage = await (await cy.get(loc(xss).split('?')[0])).text();
  check('a crew name is escaped everywhere it shows', !xpage.includes('<script>x</script>') && xpage.includes('&lt;script&gt;'));
}

const code = inviteOf(slug);
{
  const res = await anon.get(`/join/${code}`);
  const body = await res.text();
  check('signed out, the invite shows the crew, a join with GitHub button and the install lines',
    res.status === 200 && body.includes(crewName) && body.includes(`/auth/github/start?next=%2Fjoin%2F${code}`) && body.includes('npm i -g vibetime-cli@latest'));
  const page = await (await bo.get(`/join/${code}`)).text();
  check('signed in, the invite offers one-click join', page.includes(`action="/join/${code}"`) && page.includes(`signed in as @${bo.handle}`));
  const join = await bo.post(`/join/${code}`);
  check('joining by invite lands on the crew page', join.status === 303 && loc(join) === `/crew/${slug}?m=joined` && liveMembers(slug) === 2);
  const again = await bo.get(`/join/${code}`);
  check('opening the invite again as a member just opens the crew', again.status === 303 && loc(again) === `/crew/${slug}?m=already`);
  const twice = await bo.post(`/join/${code}`);
  check('joining twice does not add a second membership', loc(twice) === `/crew/${slug}?m=already` && liveMembers(slug) === 2);
  const board = await (await anon.get('/crews')).text();
  const rankedRow = new RegExp(`<td class="rank[^"]*">\\d+</td>\\s*<td><a class="who" href="/crew/${slug}"`);
  const row = (board.match(new RegExp(`<tr[^>]*>\\s*<td class="rank[^"]*">\\d+</td>\\s*<td><a class="who" href="/crew/${slug}"[\\s\\S]*?</tr>`)) ?? [''])[0];
  check('a board row shows its members\' faces', (row.match(/class="face[ "]/g) ?? []).length === 2 && row.includes('class="faces"'), row.slice(0, 300));
  check('with two members the crew gets a rank number', rankedRow.test(board) && !new RegExp(`href="/crew/${slug}"[^<]*<[\\s\\S]{0,400}needs 1 more member`).test(board));
}
{
  const direct = await cy.post(`/crew/${slug}/join`);
  check('an invite-only crew refuses a join from its page', loc(direct) === `/crew/${slug}?m=closedcrew` && liveMembers(slug) === 2);
  const cross = await cy.post(`/join/${code}`, {}, 'https://evil.example');
  check('a cross-site join is refused', cross.status === 403 && liveMembers(slug) === 2);
  const notOwner = await bo.post(`/crew/${slug}/settings`, { action: 'reset' });
  check('a member who is not the owner cannot change settings', loc(notOwner) === `/crew/${slug}` && inviteOf(slug) === code);
  const visitor = await (await cy.get(`/crew/${slug}`)).text();
  check('a visitor to an invite-only crew is told who to ask', visitor.includes('invite only') && visitor.includes(`@${ada.handle}`) && !visitor.includes('/join/'));
  await ada.post(`/crew/${slug}/settings`, { action: 'open' });
  const openPage = await (await cy.get(`/crew/${slug}`)).text();
  check('an open crew shows a join button to visitors', openPage.includes(`action="/crew/${slug}/join"`) && openPage.includes('anyone can join'));
  const joined = await cy.post(`/crew/${slug}/join`);
  check('anyone can join an open crew from its page', loc(joined) === `/crew/${slug}?m=joined` && liveMembers(slug) === 3);
}

{
  ships(ada, today, 5); ships(bo, today, 3); ships(cy, monday, 2);
  ships(bo, daysBefore(monday, 3), 7);
  const page = await (await anon.get(`/crew/${slug}`)).text();
  check('this week the crew number is the members\' ships added up', shipsOn(page) === 10, `got ${shipsOn(page)}`);
  const all = await (await anon.get(`/crew/${slug}?window=all`)).text();
  check('ships from weeks before someone joined do not count, even all time', shipsOn(all) === 10, `got ${shipsOn(all)}`);
  const board = await (await anon.get('/crews')).text();
  const topRow = (board.match(new RegExp(`href="/crew/${slug}"[\\s\\S]*?</tr>`)) ?? [''])[0];
  check('the top shipper is shown with their face', topRow.includes(`class="top" href="/@${ada.handle}"`) && topRow.includes('top-face'), topRow.slice(-400));
  check('the board shows the same number as the crew page', new RegExp(`href="/crew/${slug}"[\\s\\S]*?<td class="ships">10<small>`).test(board));
}
{
  const leave = await bo.post(`/crew/${slug}/leave`);
  check('leaving takes you off the member count', loc(leave) === `/crew/${slug}?m=left` && liveMembers(slug) === 2);
  const page = await (await anon.get(`/crew/${slug}`)).text();
  check('a member who left this week keeps their ships here, marked left', shipsOn(page) === 10 && page.includes('tag-left'));
  await bo.post(`/crew/${slug}/join`);
  const back = await (await anon.get(`/crew/${slug}`)).text();
  check('rejoining in the same week does not count anything twice', shipsOn(back) === 10 && liveMembers(slug) === 3, `got ${shipsOn(back)}`);
}
{
  const outsider = await signIn('outsider');
  const leavePage = await outsider.get(`/crew/${slug}/confirm?action=leave`);
  check('someone outside the crew is not offered a leave button', leavePage.status === 303 && loc(leavePage) === `/crew/${slug}`, `${leavePage.status}`);
  const upper = await anon.get(`/crew/${slug.toUpperCase()}`);
  check('a crew address typed in capitals still finds the crew', upper.status === 301 && loc(upper) === `/crew/${slug}`, `${upper.status} ${loc(upper)}`);
  const removeText = await (await ada.get(`/crew/${slug}/confirm?action=remove&member=${cy.id}`)).text();
  check('the remove confirmation tells the truth about rejoining', removeText.includes('can rejoin with the invite link') && removeText.includes('open'), removeText.match(/<p class="facts"[^>]*>([^<]*)/)?.[1]);
}
{
  const ownerLeave = await ada.get(`/crew/${slug}/confirm?action=leave`);
  check('the owner is asked to hand over before leaving', (await ownerLeave.text()).includes('hand the crew over first'));
  const viaPost = await ada.post(`/crew/${slug}/leave`);
  check('the owner cannot leave by posting directly', loc(viaPost) === `/crew/${slug}/confirm?action=leave` && liveMembers(slug) === 3);
  const hand = await ada.post(`/crew/${slug}/settings`, { action: 'handover', member: String(bo.id) });
  check('handing over makes the other member the owner', loc(hand) === `/crew/${slug}?m=handed` && d1(`SELECT owner_github_id o FROM crews WHERE slug='${slug}'`)[0].o === bo.id);
  const oldOwner = await ada.post(`/crew/${slug}/settings`, { action: 'reset' });
  check('the old owner loses the owner tools', loc(oldOwner) === `/crew/${slug}` && inviteOf(slug) === code);
  const toNonMember = await bo.post(`/crew/${slug}/settings`, { action: 'handover', member: '123' });
  check('a crew cannot be handed to someone outside it', d1(`SELECT owner_github_id o FROM crews WHERE slug='${slug}'`)[0].o === bo.id && loc(toNonMember) === `/crew/${slug}`);
  const remove = await bo.post(`/crew/${slug}/settings`, { action: 'remove', member: String(cy.id) });
  check('the owner can remove a member', loc(remove) === `/crew/${slug}?m=removed` && liveMembers(slug) === 2);
  await bo.post(`/crew/${slug}/settings`, { action: 'reset' });
  const old = await anon.get(`/join/${code}`);
  check('after a reset the old invite link stops working', old.status === 404 && (await old.text()).includes('no longer works') && inviteOf(slug) !== code);
  const rename = await bo.post(`/crew/${slug}/settings`, { action: 'rename', name: 'Lagos Builders' });
  const renamed = await (await anon.get(`/crew/${slug}`)).text();
  check('renaming keeps the address', loc(rename) === `/crew/${slug}?m=renamed` && renamed.includes('Lagos Builders'));
}
{
  const profile = await (await anon.get(`/@${bo.handle}`)).text();
  check('a profile lists the crews someone is in', profile.includes(`href="/crew/${slug}"`) && profile.includes('Lagos Builders'));
}

const dee = await signIn('dee');
{
  const made = [];
  for (const n of ['one', 'two', 'three']) made.push(loc(await dee.post('/crews', { name: `dee ${n} ${run}` })));
  const fourth = await dee.post('/crews', { name: `dee four ${run}` });
  check('a fourth crew is refused', fourth.status === 200 && (await fourth.text()).includes('in 3 crews already') && made.every((l) => l?.includes('?m=created')));
  await bo.post(`/crew/${slug}/settings`, { action: 'reset' });
  const invite = await (await dee.get(`/join/${inviteOf(slug)}`)).text();
  check('at three crews the invite says so instead of offering a join', invite.includes('you are in 3 crews'));
  const forced = await dee.post(`/join/${inviteOf(slug)}`);
  check('and posting the join anyway changes nothing', liveMembers(slug) === 2 && loc(forced) === `/join/${inviteOf(slug)}`);
}
{
  const eve = await signIn('eve');
  const slugs = [];
  for (let i = 0; i < 5; i++) {
    const owner = await signIn(`own${i}`);
    const l = loc(await owner.post('/crews', { name: `race ${i} ${run}` }));
    const s = l.split('?')[0].slice('/crew/'.length);
    await owner.post(`/crew/${s}/settings`, { action: 'open' });
    slugs.push(s);
  }
  // Fired together so the limit is decided by the insert, not by request order.
  await Promise.all(slugs.map((s) => eve.post(`/crew/${s}/join`)));
  const n = d1(`SELECT COUNT(*) n FROM crew_members WHERE user_github_id = ${eve.id} AND left_at IS NULL`)[0].n;
  check('five joins at once still stop at three crews', n === 3, `in ${n} crews`);
}
{
  const owner = await signIn('fullowner');
  const l = loc(await owner.post('/crews', { name: `full ${run}` }));
  const s = l.split('?')[0].slice('/crew/'.length);
  const id = crewIdOf(s);
  const values = [];
  const idBase = 600_000_000 + Math.floor(Math.random() * 100_000) * 100;
  for (let i = 0; i < 49; i++) values.push(`(${idBase + i}, 'f${run}${i}', NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`);
  d1(`INSERT INTO users (github_id, handle, avatar_url, created_at, last_seen_at) VALUES ${values.join(',')}`);
  d1(`INSERT INTO crew_members (crew_id, user_github_id, joined_at) SELECT ${id}, github_id, '2026-01-01T00:00:00Z' FROM users WHERE handle LIKE 'f${run}%' LIMIT 49`);
  await owner.post(`/crew/${s}/settings`, { action: 'open' });
  const gus = await signIn('gus');
  const res = await gus.post(`/crew/${s}/join`);
  check('a crew of 50 takes nobody else', loc(res) === `/crew/${s}?m=full` && liveMembers(s) === 50, `${loc(res)} ${liveMembers(s)}`);
}
{
  const del = await bo.get(`/crew/${slug}/confirm?action=delete`);
  check('deleting asks first', (await del.text()).includes('delete'));
  const out = await bo.post(`/crew/${slug}/settings`, { action: 'delete' });
  const gone = await anon.get(`/crew/${slug}`);
  const board = await (await anon.get('/crews')).text();
  check('a deleted crew leaves the board and its page is a 404', loc(out) === '/crews' && gone.status === 404 && !board.includes(`/crew/${slug}"`));
  check('deleting frees every member\'s slot', d1(`SELECT COUNT(*) n FROM crew_members WHERE user_github_id = ${bo.id} AND left_at IS NULL AND crew_id = (SELECT id FROM crews WHERE slug = '${slug}')`)[0].n === 0);
  const again = await ada.post('/crews', { name: crewName });
  check('the name can be used again once deleted', loc(again) === `/crew/${slug}?m=created`, loc(again));
}
{
  const lb = await (await anon.get('/leaderboard')).text();
  check('the leaderboard bar links to crews', lb.includes('href="/crews"'));
  const home = await anon.get('/');
  const homePage = await home.text();
  check('/ shows a signed-out visitor what vibetime is, how to install it, and what a ship is',
    home.status === 200 && homePage.includes('track what you vibe.') && homePage.includes('npm i -g vibetime-cli') && homePage.includes('a <b>ship</b> is') && homePage.includes('href="/leaderboard"'));
  const again = await req('/', { headers: { cookie: `vt_seen=${Date.now() - 31 * 60 * 1000}` } });
  const signedIn = await ada.get('/');
  {
    const board = await (await anon.get('/leaderboard')).text();
    check('the leaderboard says what a ship is above the fold and links to the full rule', board.includes('a ship is a commit with more than 50 lines') && board.includes('href="#ship"') && board.includes('id="ship"'));
  }
  check('the home page leads with the install on a laptop and the leaderboard on a phone, where a CLI cannot be installed',
    /<button class="btn btn-primary hide-sm"[^>]*data-copy="npm i -g vibetime-cli/.test(homePage) && homePage.includes('<a class="btn btn-primary show-sm" href="/leaderboard">'));
  check('the logo in the bar goes home', (await (await anon.get('/leaderboard')).text()).includes('<a class="brand" href="/"'));
  const signedInPage = signedIn.status === 200 ? await signedIn.text() : '';
  check('/ shows the home page to everyone, signed in or not, with the signed-in bar for people who are',
    again.status === 200 && signedIn.status === 200 && signedInPage.includes('track what you vibe.') && signedInPage.includes(`signed in as <b>@${ada.handle}</b>`),
    `${again.status} ${signedIn.status}`);
  check('the home page leaves out crews with no ships this week', !/<span class="n">0<\/span>/.test(homePage));
  const sid = randomUUID();
  d1(`INSERT INTO sessions (id, user_github_id, tool, project_hash, started_at, ended_at, duration_seconds, commits, lines_added, lines_removed, files_touched, momentum, submitted_at)
      VALUES ('${sid}', ${ada.id}, 'claude', 'p', '${today}T00:00:00Z', '${today}T01:00:00Z', 3600, 1, 60, 0, 1, 'shipped', '${today}T01:00:00Z')`);
  ships({ id: ada.id, sid }, today, 1);
  const board = await (await anon.get('/leaderboard')).text();
  check('the top three stand on a podium and the table carries on from #4',
    board.includes('<ol class="podium"') && board.includes(`href="/@${ada.handle}"`) && !/<td class="rank">[123]<\/td>/.test(board));
  check('the leaderboard tells people crews exist, with a link to them', /<a class="callout" href="\/crews">[\s\S]*?crews[\s\S]*?<\/a>/.test(lb));
  const js = await anon.get('/assets/copy.js');
  check('the copy script is served as JavaScript from the site itself', js.status === 200 && js.headers.get('content-type').startsWith('text/javascript'));
  const src = /<script src="([^"]+)"/.exec(await (await anon.get('/crews')).text())?.[1] ?? '';
  const versioned = await anon.get(src);
  check('pages load the script by a URL that changes with its contents, so a new version is never stuck in a cache',
    /^\/assets\/copy\.js\?v=[a-z0-9]+$/.test(src) && versioned.status === 200 && /immutable/.test(versioned.headers.get('cache-control') ?? ''), `${src} ${versioned.headers.get('cache-control')}`);
  const nope = await anon.get('/crew/does-not-exist-zz');
  check('an unknown crew is a 404 page, not an error', nope.status === 404);
}

{
  const backOf = async (path, referer) => {
    const res = await req(path, referer ? { headers: { referer } } : {});
    const m = /<a class="back" href="([^"]*)"><svg[\s\S]*?<\/svg>([^<]*)<\/a>/.exec(await res.text());
    return { href: m?.[1].replace(/&amp;/g, '&'), label: m?.[2], vary: res.headers.get('vary') };
  };
  const p = `/@${ada.handle}`;
  const profile = await (await req(p)).text();
  check('a profile draws twelve weeks of ships as a flat grid with a text summary',
    profile.includes('<h2>last 12 weeks</h2>') && /<svg class="weeks" viewBox="[^"]+" role="img" aria-label="[^"]*ship/.test(profile) && (profile.match(/<rect class="l\d"/g) ?? []).length >= 78);
  const badge = await req(`${p}/badge.svg?window=week`);
  const badgeSvg = await badge.text();
  const missing = await (await req('/@nobody-here-zz/badge.svg')).text();
  check('a profile serves a README badge, and an unknown handle gets a "not found" badge, not a broken image',
    badge.status === 200 && badge.headers.get('content-type').startsWith('image/svg+xml') && /ships? this week<\/text>/.test(badgeSvg) && missing.includes('>not found</text>'));
  const plain = await backOf(p);
  check('a profile opened directly offers a way back to the leaderboard', plain.href === '/leaderboard' && plain.label === 'leaderboard', JSON.stringify(plain));
  const fromMonth = await backOf(p, `${BASE}/leaderboard?window=month`);
  check('from the leaderboard, back keeps the tab you were on', fromMonth.href === '/leaderboard?window=month' && fromMonth.vary?.includes('referer'), JSON.stringify(fromMonth));
  const fromCrew = await backOf(p, `${BASE}/crew/${slug}`);
  check('from a crew, back returns to that crew', fromCrew.href === `/crew/${slug}` && fromCrew.label === 'back to the crew', JSON.stringify(fromCrew));
  const fromElsewhere = await backOf(p, 'https://evil.example/leaderboard');
  check('a link from another site never becomes the back link', fromElsewhere.href === '/leaderboard', JSON.stringify(fromElsewhere));
  const crewPlain = await backOf(`/crew/${slug}`);
  const crewFromProfile = await backOf(`/crew/${slug}`, `${BASE}${p}`);
  check('a crew page goes back to crews, or to the profile you came from',
    crewPlain.href === '/crews' && crewFromProfile.href === p && crewFromProfile.label === `@${ada.handle}`, JSON.stringify([crewPlain, crewFromProfile]));
}

{
  // The spec's growth loop: someone who signs in on the web but has never run
  // the CLI must be told how to make their ships count.
  const owner = await signIn('specowner');
  const fresh = await signIn('specfresh');
  const veteran = await signIn('specveteran');
  d1(`INSERT INTO sessions (id, user_github_id, tool, project_hash, started_at, ended_at, duration_seconds, commits, lines_added, lines_removed, files_touched, momentum, submitted_at)
      VALUES ('${randomUUID()}', ${veteran.id}, 'claude', 'p', '2026-10-01T00:00:00Z', '2026-10-01T01:00:00Z', 3600, 1, 60, 0, 1, 'shipped', '2026-10-01T01:00:00Z')`);
  const s2 = loc(await owner.post('/crews', { name: `spec check ${run}` })).split('?')[0].slice('/crew/'.length);
  ships(owner, today, 4);
  await owner.post(`/crew/${s2}/settings`, { action: 'open' });
  const code2 = inviteOf(s2);
  const invFresh = await (await fresh.get(`/join/${code2}`)).text();
  const invVet = await (await veteran.get(`/join/${code2}`)).text();
  check('signed in, the invite says how many of your 3 crews you are in', invFresh.includes('you are in 0 of 3 crews'), invFresh.match(/signed in as[^<]*/)?.[0]);
  check('signed in without ever running the CLI, the invite still shows the install lines',
    invFresh.includes('npm i -g vibetime-cli@latest') && !invVet.includes('npm i -g vibetime-cli@latest'));
  await fresh.post(`/join/${code2}`);
  await veteran.post(`/join/${code2}`);
  const crewFresh = await (await fresh.get(`/crew/${s2}`)).text();
  const crewVet = await (await veteran.get(`/crew/${s2}`)).text();
  check('a member who has never run the CLI sees the install lines on the crew page', crewFresh.includes('npm i -g vibetime-cli@latest') && !crewVet.includes('npm i -g vibetime-cli@latest'));
  const prof = await (await anon.get(`/@${owner.handle}`)).text();
  const chips = prof.match(/<div class="chips">[\s\S]*?<\/div>/)?.[0] ?? '';
  check('profile chips show the crew\'s rank this week', /#\d+/.test(chips), chips.slice(0, 200));
  const form = await (await owner.get('/crews/new')).text();
  check('the create form shows the address the crew will get', form.includes('id="slug-preview"') && form.includes('127.0.0.1:' + port + '/crew/…'));
}

{
  const emo = await signIn('emoji');
  const s = loc(await emo.post('/crews', { name: `m${run} 😎` })).split('?')[0].slice('/crew/'.length);
  const page = await (await emo.get(`/crew/${s}`)).text();
  check('crew initials keep an emoji whole', page.includes('>M😎<') && !page.includes('�'));
}

github.close();
console.log(failed === 0 ? '\nall passed' : `\n${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
