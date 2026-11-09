// GitHub's published limits (P27, PD-22). Bob, 6 Nov: "rather than limiting usage to a small fraction
// of github's stated limits, I'd suggest that the tooling limit usage to 80% or 90% of github's
// published limits." Bob, 9 Nov: "If github usage reporting is expensive then don't do it beyond just
// making sure that we don't exceed published limits."
//
// So the tool keeps no record of its own calls (PD-22 retired R17's ledger, its share, audit and
// hook). It reads GitHub's own count, /rate_limit, which does not count against the primary limit:
// - before a GitHub-heavy act (a job or lane start: budgetGate);
// - when a gh call fails with GitHub's 403 or 429 rate-limit refusal, or with a 5xx (backoff).
// It backs off while used is at least pacing.target (85%) of a limit, until that limit's reset, or
// for as long as GitHub's Retry-After says.
// No import from util.mjs (util imports this).
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { isAbsolute, resolve } from 'node:path';

export const PACING_DEFAULTS = { target: 0.85, poll_first_s: 30 };
// Keys of R17's ledger and of the brakes PD-6 retired: accepted in an old config, ignored (PD-22).
export const RETIRED_PACING = ['gh_interval_ms', 'share_s', 'ledger', 'read_ledgers', 'github_limits', 'pushes_per_hour', 'jobs', 'lanes', 'poll_most_s'];
export const TARGET_RANGE = [0.8, 0.9];
export const POLL_FLOOR_S = 30;
// A back-off longer than this is not waited out in the command: it refuses, naming when to rerun.
export const MAX_WAIT_MIN = 15;

let current = { ...PACING_DEFAULTS };
// The pacing in force: the defaults, the config's "pacing" over them (configOf sets it).
export function setPacing(p) { current = { target: p?.target ?? PACING_DEFAULTS.target, poll_first_s: p?.poll_first_s ?? PACING_DEFAULTS.poll_first_s }; }
export const pacing = () => current;
// Checks a config's "pacing" block; returns the problem or null.
export function pacingProblem(p) {
  if (p === undefined) return null;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return 'pacing is an object';
  for (const k of Object.keys(p)) if (!(k in PACING_DEFAULTS) && !RETIRED_PACING.includes(k)) return `pacing.${k} is not a pacing key (${Object.keys(PACING_DEFAULTS).join(', ')})`;
  if (p.target !== undefined && !(typeof p.target === 'number' && p.target >= TARGET_RANGE[0] && p.target <= TARGET_RANGE[1])) return `pacing.target is between ${TARGET_RANGE[0]} and ${TARGET_RANGE[1]}: the share of GitHub's published limits the tool uses (Bob, 6 Nov: "80% or 90%")`;
  if (p.poll_first_s !== undefined && !(Number.isInteger(p.poll_first_s) && p.poll_first_s >= POLL_FLOOR_S)) return `pacing.poll_first_s is a whole number, ${POLL_FLOOR_S} or more: the poll cadence`;
  return null;
}
// The pause before a poll of GitHub: poll_first_s, fixed (PD-6).
export function pollMs(k, p = pacing()) {
  return Math.max(POLL_FLOOR_S, p.poll_first_s) * 1000;
}

// The clone's git directory (shared by its worktrees), where the tool's per-clone files live; the
// temp directory when cwd is no clone. Asked of git once per directory and process.
const dirs = new Map();
export function commonDir(cwd) {
  const at = cwd || process.cwd();
  if (dirs.has(at)) return dirs.get(at);
  const r = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: at, encoding: 'utf8' });
  const d = r.status === 0 ? r.stdout.trim() : '';
  const out = !d ? tmpdir() : isAbsolute(d) ? d : resolve(at, d);
  if (d) dirs.set(at, out);
  return out;
}

// A rate-limit refusal in a gh call's or a git push's output: GitHub's words for the primary and
// secondary limits, a 403 or 429 that names a rate limit or carries GitHub's Retry-After or
// x-ratelimit headers, or any other 429 unless a proxy says it is its own. Returns { kind,
// retryAfter (s), reset (ms) } or null. A 403 that names no rate limit is a failed call.
export function limitSignal(text) {
  const t = String(text || '');
  const secondary = /secondary rate limit|abuse detection/i.test(t);
  const primary = /API rate limit exceeded|rate limit exceeded for/i.test(t) && !secondary;
  const http = /HTTP (403|429)\b/.test(t) || /\b429 Too Many Requests\b/i.test(t);
  const headers = /retry-after:\s*\d+|x-ratelimit-remaining:\s*0\b/i.test(t);
  const github429 = /\bHTTP 429\b|returned error: 429\b|\b429 Too Many Requests\b/i.test(t) && !/proxy|concurrent transfers/i.test(t);
  if (!secondary && !primary && !(http && (/rate limit/i.test(t) || headers)) && !github429) return null;
  const ra = t.match(/retry-after:\s*(\d+)/i);
  const reset = t.match(/x-ratelimit-reset:\s*(\d+)/i);
  return { kind: primary ? 'primary' : 'secondary', retryAfter: ra ? Number(ra[1]) : null, reset: reset ? Number(reset[1]) * 1000 : null };
}
// GitHub's 5xx, as gh prints it.
export const SERVER_5XX = /\bHTTP 5\d\d\b|\(HTTP 5\d\d\)|\b5\d\d (Internal Server Error|Bad Gateway|Service Unavailable|Gateway Time-?out)\b/i;

// GitHub's own count: /rate_limit's core (REST) and graphql buckets, each { limit, remaining, reset
// (ms) }; null when it cannot be read. Never called under the test runner (the tests pass `read`).
export function readRateLimit(cwd) {
  if (process.env.NODE_TEST_CONTEXT) return null;
  const r = spawnSync('gh', ['api', 'rate_limit'], { cwd, encoding: 'utf8' });
  if (r.status !== 0) return null;
  try {
    const { core: c, graphql: g } = JSON.parse(r.stdout).resources;
    const one = (x) => (x ? { limit: x.limit, remaining: x.remaining, reset: x.reset * 1000 } : null);
    return { core: one(c), graphql: one(g) };
  } catch { return null; }
}
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
// The bucket at or over the target whose reset is still ahead, with a reason; else null.
function hot(rl, { target, now }) {
  for (const k of ['core', 'graphql']) {
    const b = rl?.[k];
    if (b && b.limit > 0 && b.limit - b.remaining >= Math.floor(target * b.limit) && b.reset > now) return { until: b.reset, why: `${b.limit - b.remaining} of GitHub's ${k === 'core' ? 'REST' : 'GraphQL'} primary limit of ${b.limit} an hour used, at or over the target ${Math.round(target * 100)}%, until ${iso(b.reset)}` };
  }
  return null;
}

// Before a GitHub-heavy act (a job or lane start): the reason to hold it, or null.
export function budgetGate(cwd, { read = readRateLimit, now = Date.now(), p = pacing() } = {}) {
  return hot(read(cwd), { target: p.target, now })?.why || null;
}

// After a gh call that failed: how long to back off, or null. GitHub's Retry-After first; else, on a
// rate-limit refusal or a 5xx, /rate_limit read: a bucket at or over the target waits for its reset.
// A refusal with neither waits for x-ratelimit-reset, else a minute (GitHub's docs). A 5xx with room
// under the target is a failed call, not a back-off. Returns { until (ms), why, retry } where retry
// says whether the call may be made again (a refusal: GitHub did not act; a 5xx: it may have).
export function backoff(stderr, cwd, { read = readRateLimit, now = Date.now(), p = pacing() } = {}) {
  const sig = limitSignal(stderr);
  const five = !sig && SERVER_5XX.test(String(stderr || ''));
  if (!sig && !five) return null;
  if (sig?.retryAfter !== null && sig?.retryAfter !== undefined) return { until: now + sig.retryAfter * 1000, why: `GitHub's ${sig.kind} rate limit, Retry-After ${sig.retryAfter} s`, retry: true };
  const h = hot(read(cwd), { target: p.target, now });
  if (h) return { ...h, retry: !five };
  if (five) return null;
  const until = sig.reset && sig.reset > now ? sig.reset : now + 60e3;
  return { until, why: `GitHub's ${sig.kind} rate limit, until ${iso(until)}`, retry: true };
}

// p3 github budget: one read of /rate_limit against the target. Returns what it read (null: unread).
export function githubBudget(cwd, { read = readRateLimit, log = console.log, p = pacing(), now = Date.now() } = {}) {
  const rl = read(cwd);
  log(`github budget: the target is ${Math.round(p.target * 100)}% of GitHub's published limits (P27, PD-22)`);
  if (!rl) { log('- /rate_limit not answered'); return null; }
  for (const k of ['core', 'graphql']) {
    const b = rl[k];
    if (b) log(`- ${k === 'core' ? 'REST' : 'GraphQL'} primary, an hour: ${b.limit - b.remaining}/${b.limit} (${Math.round((100 * (b.limit - b.remaining)) / b.limit)}%), resets ${iso(b.reset)}`);
  }
  const h = hot(rl, { target: p.target, now });
  log(h ? `BACKING OFF: ${h.why}` : 'under the target');
  return rl;
}
