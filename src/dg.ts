// delta-git ship attestation sink.
//
// A session's stats are self-reported everywhere they land. When the session's
// repo is pushed through a delta-git forge, the forge can prove them instead:
// it checks the claimed commit oids against its object store (or, for
// remote-backed repos, the configured upstream's public patch endpoint) and
// recomputes the deltas, then records the verdict in its hash-chained op-log.
// The ship claim below turns self-reported counts into forge-verified proof.
//
// Everything stays client-side in the vibetime spirit: the agent key lives
// only in ~/.vibe, never leaves this machine, and the wire carries commit shas
// and counts — never code, diffs, or session contents. Sessions on repos with
// no delta-git remote are ignored entirely; VIBE_NO_DG=1 disables the sink.

import { execFileSync } from 'node:child_process';
import { createHash, generateKeyPairSync, createPrivateKey, sign, type KeyObject } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { VIBE_DIR } from './config.js';
import type { Session } from './db.js';

const DG_FORGE = process.env.DG_FORGE ?? 'code.widespread.fyi';
const KEY_PATH = join(VIBE_DIR, 'dg-agent.key');
const MAX_COMMITS = 64; // the /dg/ship schema's bound

// --- agent identity --------------------------------------------------------
// A did:key ed25519 identity, generated lazily and held only on this device.
// The raw 32-byte seed is stored hex-encoded at ~/.vibe/dg-agent.key (0600).

interface DgIdentity {
  did: string;
  pubkeyHex: string;
  key: KeyObject;
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58encode(bytes: Uint8Array): string {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  return '1'.repeat(zeros) + digits.reverse().map((d) => B58[d]).join('');
}

let identity: DgIdentity | null = null;
function dgIdentity(): DgIdentity {
  if (identity) return identity;
  mkdirSync(VIBE_DIR, { recursive: true, mode: 0o700 });
  let seedHex: string;
  if (existsSync(KEY_PATH)) {
    seedHex = readFileSync(KEY_PATH, 'utf8').trim();
    if (!/^[0-9a-f]{64}$/i.test(seedHex)) throw new Error(`corrupt ${KEY_PATH}`);
  } else {
    const pair = generateKeyPairSync('ed25519');
    const jwk = pair.privateKey.export({ format: 'jwk' }) as { d: string };
    seedHex = Buffer.from(jwk.d, 'base64url').toString('hex');
    writeFileSync(KEY_PATH, seedHex + '\n', { mode: 0o600 });
  }
  const seed = Buffer.from(seedHex, 'hex');
  // Node refuses a seed-only ed25519 JWK, so rebuild the key as PKCS8 DER —
  // a fixed 16-byte header + OCTET STRING(seed) — then read the public half
  // back out for the did:key.
  const pkcs8 = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]);
  const key = createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
  const pub = Buffer.from((key.export({ format: 'jwk' }) as { x: string }).x, 'base64url');
  const did = `did:key:z${b58encode(new Uint8Array([0xed, 0x01, ...pub]))}`;
  identity = { did, pubkeyHex: pub.toString('hex'), key };
  return identity;
}

// --- signed request --------------------------------------------------------

const te = new TextEncoder();
const hexOf = (b: Uint8Array | Buffer) => Buffer.from(b).toString('hex');
const sha256Hex = (input: string | Uint8Array) =>
  createHash('sha256').update(typeof input === 'string' ? input : Buffer.from(input)).digest('hex');

async function dgFetch(
  path: string,
  body: Uint8Array,
  id: DgIdentity,
): Promise<{ status: number; text: string }> {
  const ts = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const bodySha = sha256Hex(body);
  // Same dg1 envelope as every other signed agent call: sha256 of the
  // canonical string, hex-encoded, signed as bytes.
  const payload = sha256Hex(`dg1\n${id.did}\n${ts}\n${nonce}\nPOST\n${path}\n${bodySha}`);
  const sig = sign(null, te.encode(payload), id.key);
  const res = await fetch(`https://${DG_FORGE}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-dg-did': id.did,
      'x-dg-ts': ts,
      'x-dg-nonce': nonce,
      'x-dg-sig': hexOf(sig),
      'x-dg-model': 'vibetime-cli',
    },
    body: Buffer.from(body),
    signal: AbortSignal.timeout(5000),
  });
  return { status: res.status, text: await res.text() };
}

// Unknown DIDs are rejected until registered once; permissionless, keyed to
// the pubkey — the DID falls out of the key.
async function ensureRegistered(id: DgIdentity): Promise<void> {
  const res = await fetch(`https://${DG_FORGE}/api/agents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pubkey: id.pubkeyHex, label: 'vibetime', model: 'vibetime-cli' }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok && res.status !== 409) throw new Error(`agent register: ${res.status}`);
}

// --- session → claim --------------------------------------------------------

interface ForgeRepo {
  dir: string;
  owner: string;
  repo: string;
}

// The repos a session watched that are pushed to this forge. Only `origin`
// is consulted — the remote that carries the pushes the forge can verify.
function forgeRepos(session: Session): ForgeRepo[] {
  const dirs = (session.repos ?? []).map((r) => r.path).filter(Boolean);
  if (dirs.length === 0 && session.project) dirs.push(session.project);
  const out: ForgeRepo[] = [];
  const host = DG_FORGE.replace(/\./g, '\\.');
  for (const dir of dirs) {
    let url: string;
    try {
      url = execFileSync('git', ['-C', dir, 'remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
    } catch {
      continue;
    }
    const m =
      url.match(new RegExp(`^https?://${host}/([^/]+)/([^/]+?)(?:\\.git)?/?$`)) ??
      url.match(new RegExp(`^git@${host}:([^/]+)/([^/]+?)(?:\\.git)?$`));
    if (m) out.push({ dir, owner: m[1], repo: m[2] });
  }
  return out;
}

const hasSha = (dir: string, sha: string): boolean => {
  try {
    execFileSync('git', ['-C', dir, 'cat-file', '-e', sha], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

// commitFacts span every repo a session watched; a claim must only name shas
// the target repo actually contains, or verification rejects the session.
function pickRepo(facts: { sha: string }[], repos: ForgeRepo[]): { target: ForgeRepo; shas: string[] } | null {
  let best: { target: ForgeRepo; shas: string[] } | null = null;
  for (const target of repos) {
    const shas = facts.map((f) => f.sha).filter((sha) => /^[0-9a-f]{40}$/i.test(sha) && hasSha(target.dir, sha));
    if (!best || shas.length > best.shas.length) best = { target, shas };
  }
  return best && best.shas.length > 0 ? best : null;
}

/**
 * Submit a forge-verified ship claim for an ended session. Best-effort by
 * contract: every failure path returns quietly so a forge outage or an
 * unverifiable session can never delay or fail the vibetime submission it
 * follows. Returns true when the forge verified the ship.
 */
export async function submitDgShip(session: Session): Promise<boolean> {
  if (process.env.VIBE_NO_DG) return false;
  if (session.exitCode === -1 || !session.commitFacts?.length) return false;
  try {
    const repos = forgeRepos(session);
    if (repos.length === 0) return false;
    const picked = pickRepo(session.commitFacts, repos);
    if (!picked) return false;
    const { target, shas } = picked;

    const id = dgIdentity();
    const path = `/api/${target.owner}/${target.repo}/dg/ship`;
    const body = te.encode(
      JSON.stringify({
        session_id: session.id,
        tool: session.tool.split('/').pop() || session.tool,
        started_at: session.startedAt,
        ended_at: session.endedAt,
        duration_seconds: Math.round(session.durationSeconds),
        commits: shas.slice(0, MAX_COMMITS),
        claimed: {
          lines_added: session.linesAdded,
          lines_removed: session.linesRemoved,
          files_touched: session.filesTouched,
        },
      }),
    );

    let res = await dgFetch(path, body, id);
    if (res.status === 401 || res.status === 403) {
      // First run for this key: register, then retry once.
      await ensureRegistered(id);
      res = await dgFetch(path, body, id);
    }
    return res.status === 200;
  } catch {
    return false;
  }
}
