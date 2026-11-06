// GitHub pacing (R17; coordinator, 6 Nov): the civicsmith account was suspended at 19:19Z,
// most likely for automated bulk activity (GitHub's Acceptable Use Policies, section 4; the API
// terms' "excessively frequent requests"). Measured on the copy that day: 1,387 state-branch
// pushes since midnight, 173 in the busiest hour (the merge train's), about 70 an hour in the
// layer flow; gh calls were not logged at all. So:
// - every gh call waits its turn (one per `gh_interval_ms` per clone) and is logged;
// - every push and Actions dispatch the tool makes is logged, for `github budget`;
// - waits on GitHub poll from `poll_first_s` up to `poll_most_s`, never tighter than 30 s;
// - the job cap is at most `pacing.jobs`, and live lane seats at most `pacing.lanes`.
// Each is configurable under "pacing" in process/config.json.
// No import from util.mjs (util imports this).
import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

export const PACING_DEFAULTS = { jobs: 4, lanes: 1, gh_interval_ms: 2000, poll_first_s: 30, poll_most_s: 300 };
export const POLL_FLOOR_S = 30;
export const GITHUB_LOG = 'p3-github.jsonl';
const STAMP = 'p3-gh-pace';

let current = { ...PACING_DEFAULTS };
// The pacing in force: the defaults, the config's "pacing" over them (configOf sets it), and for
// the tests P3_GH_INTERVAL_MS over the interval.
export function setPacing(p) { current = { ...PACING_DEFAULTS, ...(p || {}) }; }
export function pacing(env = process.env) {
  const ms = env.P3_GH_INTERVAL_MS;
  return { ...current, ...(ms !== undefined && ms !== '' && /^\d+$/.test(ms) ? { gh_interval_ms: Number(ms) } : {}) };
}
// The session caps in force for a config: its pacing.jobs and pacing.lanes. Under the test runner
// only (NODE_TEST_CONTEXT), P3_TEST_PACING_JOBS and _LANES stand in, so the tests written for the
// account's job cap keep testing it; nothing outside a test run reads them.
const testCap = (v, env) => (env.NODE_TEST_CONTEXT && /^\d+$/.test(String(v ?? '')) ? Number(v) : null);
export const pacedJobs = (cfg = {}, env = process.env) => testCap(env.P3_TEST_PACING_JOBS, env) ?? cfg.pacing?.jobs ?? PACING_DEFAULTS.jobs;
export const pacedLanes = (cfg = {}, env = process.env) => testCap(env.P3_TEST_PACING_LANES, env) ?? cfg.pacing?.lanes ?? PACING_DEFAULTS.lanes;
// Checks a config's "pacing" block; returns the problem or null.
export function pacingProblem(p) {
  if (p === undefined) return null;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return 'pacing is an object';
  for (const k of Object.keys(p)) if (!(k in PACING_DEFAULTS)) return `pacing.${k} is not a pacing key (${Object.keys(PACING_DEFAULTS).join(', ')})`;
  for (const k of ['jobs', 'lanes', 'gh_interval_ms', 'poll_first_s', 'poll_most_s']) if (p[k] !== undefined && !(Number.isInteger(p[k]) && p[k] >= (k === 'jobs' || k === 'lanes' ? 1 : 0))) return `pacing.${k} is a whole number${k === 'jobs' || k === 'lanes' ? ', 1 or more' : ''}`;
  if (p.poll_first_s !== undefined && p.poll_first_s < POLL_FLOOR_S) return `pacing.poll_first_s is ${POLL_FLOOR_S} or more: no wait on GitHub polls tighter than ${POLL_FLOOR_S} s`;
  const first = p.poll_first_s ?? PACING_DEFAULTS.poll_first_s;
  if (p.poll_most_s !== undefined && p.poll_most_s < first) return 'pacing.poll_most_s is at least pacing.poll_first_s';
  return null;
}

// The pause before the k-th poll in a row (k from 1): poll_first_s doubling to poll_most_s.
export function pollMs(k, p = pacing()) {
  const first = Math.max(POLL_FLOOR_S, p.poll_first_s) * 1000;
  return Math.min(Math.max(first, p.poll_most_s * 1000), first * 2 ** Math.max(0, k - 1));
}

// The clone's git directory (shared by its worktrees), where the stamp and the log live; the temp
// directory when cwd is no clone.
function commonDir(cwd) {
  const r = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: cwd || process.cwd(), encoding: 'utf8' });
  const d = r.status === 0 ? r.stdout.trim() : '';
  if (!d) return tmpdir();
  return isAbsolute(d) ? d : resolve(cwd || process.cwd(), d);
}
export const githubLog = (cwd) => process.env.P3_GITHUB_LOG || join(commonDir(cwd), GITHUB_LOG);

// One event: a gh call, a push, an Actions dispatch. Never fails the act it records.
export function logEvent(kind, what, cwd) {
  if (process.env.P3_GITHUB_LOG === '0') return;
  try { appendFileSync(githubLog(cwd), JSON.stringify({ at: new Date().toISOString(), kind, session: process.env.CLAUDE_CODE_SESSION_ID || process.env.P3_SESSION || null, what: String(what).slice(0, 120) }) + '\n'); } catch { /* the log is a record, not a gate */ }
}

const nap = (ms) => { if (ms > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); };
// Before a gh call: wait until the clone's last call is gh_interval_ms old, then take the turn.
export function ghTurn(args, cwd, { p = pacing(), now = Date.now, sleep = nap } = {}) {
  const ms = p.gh_interval_ms;
  if (ms > 0) {
    const f = join(commonDir(cwd), STAMP);
    let last = 0;
    try { last = Number(readFileSync(f, 'utf8')) || 0; } catch { last = 0; }
    const wait = last + ms - now();
    if (wait > 0) sleep(Math.min(wait, ms));
    try { writeFileSync(f, String(now())); } catch { /* best effort */ }
  }
  const a = args.map(String);
  const actions = (a[0] === 'workflow' && a[1] === 'run') || (a[0] === 'run' && a[1] === 'rerun') || (a[0] === 'api' && a.some((x) => /\/actions\/(workflows\/[^/]+\/dispatches|runs\/\d+\/rerun)/.test(x)));
  logEvent(actions ? 'actions' : 'gh', a.filter((x) => !x.startsWith('-')).slice(0, 3).join(' '), cwd);
}

// git push (not --dry-run): logged.
export function pushSeen(args, cwd) {
  if (args[0] !== 'push' || args.includes('--dry-run') || args.includes('-n')) return;
  logEvent('push', args.filter((x) => !x.startsWith('-')).slice(1).join(' '), cwd);
}

// p3 github budget [--hours 1]: calls, pushes and Actions dispatches per session in the window,
// from this clone's log.
export function githubBudget(cwd, { hours = 1, now = Date.now(), log = console.log, p = pacing() } = {}) {
  const h = Number(hours);
  if (!(h > 0)) throw new Error('--hours <n>: a positive number of hours');
  const since = now - h * 3600e3;
  let rows = [];
  try { rows = readFileSync(githubLog(cwd), 'utf8').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }); } catch { rows = []; }
  rows = rows.filter((r) => Date.parse(r.at) >= since);
  const by = new Map();
  for (const r of rows) {
    const k = r.session || '(no session id)';
    const x = by.get(k) || { session: k, gh: 0, push: 0, actions: 0 };
    x[r.kind] = (x[r.kind] || 0) + 1;
    by.set(k, x);
  }
  const all = [...by.values()].sort((a, b) => (b.gh + b.push + b.actions) - (a.gh + a.push + a.actions));
  const sum = all.reduce((s, x) => ({ gh: s.gh + x.gh, push: s.push + x.push, actions: s.actions + x.actions }), { gh: 0, push: 0, actions: 0 });
  log(`github budget, the last ${h} h, this clone (${githubLog(cwd)}): ${sum.gh} gh call(s), ${sum.push} push(es), ${sum.actions} Actions dispatch(es); the pace: one gh call per ${p.gh_interval_ms / 1000} s per clone (at most ${p.gh_interval_ms ? Math.floor(3600e3 * h / p.gh_interval_ms) : 'any number'} in ${h} h)`);
  for (const x of all) log(`- ${x.session}: ${x.gh} gh, ${x.push} push, ${x.actions} actions`);
  if (!all.length) log('- nothing logged in the window');
  log('Each push to a branch with workflows also starts their runs on GitHub; the Actions count is the tool\'s own dispatches and re-runs only.');
  return { ...sum, sessions: all };
}
